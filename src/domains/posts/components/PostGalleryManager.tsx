'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { ACCEPTED_IMAGE_TYPES, imageUrl } from "@/core/imageUrl";
import { uploadsConfig } from "@/config/uploads";
import { deletePostImageAction, setPostCoverAction, updatePostImageCaptionAction, uploadPostImageAction } from "@/domains/posts/actions/postImageActions";
import type { PostGalleryResource, PostImageResource } from "@/domains/posts/dto/postResources";
import { fieldError } from "@/components/general/FieldError";
import { ActionIcon, Badge, Button, Group, Modal, Progress, Text, TextInput } from "@mantine/core";
import { IconPhotoPlus, IconTrash } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useRef, useState } from "react";

type PostGalleryManagerProps<T extends PostGalleryResource> = {
  postId: number,
  coverImageId: number | null,
  images: StrictResource<T, PostGalleryResource>
}

type QueueItem = { key: string, name: string, status: 'waiting' | 'uploading' | 'error', error?: string }

/*
  Галерея черновика: загрузка (кнопка и перетаскивание) по файлу на запрос, подписи,
  обложка, удаление. Список после каждого действия приходит с сервера (revalidatePath)
*/
export default function PostGalleryManager<T extends PostGalleryResource>({ postId, coverImageId, images }: PostGalleryManagerProps<T>) {
  const [ queue, setQueue ] = useState<QueueItem[]>([]);
  const [ dragging, setDragging ] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const upload = useAction(uploadPostImageAction.bind(null, postId));
  const cover = coverImageId ?? images[0]?.id;
  const busy = queue.some(item => item.status !== 'error');
  const free = uploadsConfig.postImagesPerPost - images.length;

  async function addFiles(files: File[]){
    const accepted: { item: QueueItem, file: File }[] = [];
    const rejected: QueueItem[] = [];

    for(const file of files){
      const key = `${file.name}-${file.size}-${Math.random()}`;
      // Проверка до запроса — не гонять 5 МБ ради отказа; сервер всё равно проверит содержимое
      const error = !ACCEPTED_IMAGE_TYPES.includes(file.type)
        ? 'Нужна картинка jpeg, png или webp'
        : file.size > uploadsConfig.maxBytes
          ? 'Файл больше 5 МБ'
          : accepted.length >= free ? `Не больше ${uploadsConfig.postImagesPerPost} картинок в посте` : undefined;

      if(error){
        rejected.push({ key, name: file.name, status: 'error', error });
      }
      else{
        accepted.push({ item: { key, name: file.name, status: 'waiting' }, file });
      }
    }

    setQueue(prev => [ ...prev.filter(i => i.status !== 'error'), ...rejected, ...accepted.map(a => a.item) ]);

    for(const { item, file } of accepted){
      setQueue(prev => prev.map(i => i.key === item.key ? { ...i, status: 'uploading' } : i));

      const result = await upload.executeAsync({ file });
      const error = result?.serverError?.message ?? fieldError(result?.validationErrors, 'file');

      setQueue(prev => error
        ? prev.map(i => i.key === item.key ? { ...i, status: 'error', error } : i)
        : prev.filter(i => i.key !== item.key));
    }
  }

  return (
    <div className="ui-gallery-manager">
      { images.length > 0 && <div className="ui-gallery ui-gallery--manage">
        { images.map(image => <GalleryTile key={image.id} image={image} isCover={image.id === cover} />) }
      </div> }

      { free > 0 && <div
        className="ui-dropzone"
        data-dragging={dragging || undefined}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles([ ...e.dataTransfer.files ]) }}
      >
        <IconPhotoPlus size={26} stroke={1.5} />
        <Text size="sm">Перетащите картинки сюда или</Text>
        <Button size="compact-sm" variant="light" disabled={busy} onClick={() => input.current?.click()}>Выберите файлы</Button>
        <Text size="xs" c="dimmed">jpeg, png или webp до 5 МБ · можно ещё { free }</Text>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          hidden
          aria-label="Файлы картинок"
          onChange={e => { addFiles([ ...(e.target.files ?? []) ]); e.target.value = '' }}
        />
      </div> }

      { queue.length > 0 && <ul className="ui-upload-queue">
        { queue.map(item => <li key={item.key} data-status={item.status}>
          <Text size="sm" truncate>{ item.name }</Text>
          { item.status === 'error'
            ? <Text size="xs" c="red">{ item.error }</Text>
            : <Progress value={100} animated={item.status === 'uploading'} striped size="sm" color={item.status === 'waiting' ? 'gray' : undefined} /> }
        </li>) }
      </ul> }
    </div>
  );
}

function GalleryTile({ image, isCover }: { image: PostImageResource, isCover: boolean }){
  const [ caption, setCaption ] = useState(image.caption ?? '');
  const [ confirming, setConfirming ] = useState(false);
  const save = useAction(updatePostImageCaptionAction.bind(null, image.id));
  const makeCover = useAction(setPostCoverAction.bind(null, image.id));
  const remove = useAction(deletePostImageAction.bind(null, image.id), { onSuccess: () => setConfirming(false) });
  const error = save.result.serverError ?? makeCover.result.serverError ?? remove.result.serverError;
  const saveCaption = () => caption !== (image.caption ?? '') && save.execute({ caption });

  return (
    <figure className="ui-gallery__tile">
      <img src={imageUrl(image.fileKey, 400)} width={image.width} height={image.height} alt={image.caption ?? ''} />
      <TextInput
        size="xs"
        placeholder="Подпись"
        aria-label="Подпись к картинке"
        maxLength={200}
        value={caption}
        onChange={e => setCaption(e.target.value)}
        onBlur={saveCaption}
        onKeyDown={e => { if(e.key === 'Enter'){ e.preventDefault(); saveCaption() } }}
        error={fieldError(save.result.validationErrors, 'caption')}
        rightSection={save.isPending ? '…' : null}
      />
      <Group gap={6} justify="space-between" wrap="nowrap">
        { isCover
          ? <Badge size="sm" variant="light">Обложка</Badge>
          : <Button size="compact-xs" variant="subtle" px={4} loading={makeCover.isPending} onClick={() => makeCover.execute()}>Сделать обложкой</Button> }
        <ActionIcon variant="subtle" color="red" size="sm" aria-label="Удалить" title="Удалить" onClick={() => setConfirming(true)}>
          <IconTrash size={15} stroke={1.8} />
        </ActionIcon>
      </Group>
      { error && <Text size="xs" c="red">{ error.message }</Text> }

      <Modal opened={confirming} onClose={() => setConfirming(false)} title="Удалить картинку?">
        { image.commentsCount > 0 && <Text size="sm" mb="md">Удалятся и комментарии к ней: { image.commentsCount }.</Text> }
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirming(false)}>Отмена</Button>
          <Button color="red" loading={remove.isPending} onClick={() => remove.execute()}>Удалить</Button>
        </Group>
      </Modal>
    </figure>
  );
}
