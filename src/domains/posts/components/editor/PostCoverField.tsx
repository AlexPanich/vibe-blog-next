'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { ACCEPTED_IMAGE_TYPES, imageUrl } from "@/core/imageUrl";
import { uploadsConfig } from "@/config/uploads";
import { fieldError } from "@/components/general/FieldError";
import { setPostCoverAction, uploadPostImageAction } from "@/domains/posts/actions/postImageActions";
import type { PostCoverResource } from "@/domains/posts/dto/postResources";
import { Button, Input } from "@mantine/core";
import { IconPhotoPlus, IconReplace } from "@tabler/icons-react";
import { useRef, useState, useTransition } from "react";

type PostCoverFieldProps<T extends PostCoverResource> = {
  // Нет id — пост ещё не сохранён, загружать некуда
  postId?: number,
  // Текущая обложка: выбранная или первая картинка галереи
  cover: StrictResource<T, PostCoverResource> | null,
  // В галерее не осталось места
  full?: boolean
}

/*
  Обложка (спека 42): зона перетаскивания. Отдельного поля у поста нет — файл уходит в
  галерею и назначается обложкой (`coverImageId`), поэтому до первого сохранения зона
  только объясняет, что делать. Выбрать обложку из уже загруженных — в «Фото к посту»
*/
export default function PostCoverField<T extends PostCoverResource>({ postId, cover, full = false }: PostCoverFieldProps<T>) {
  const [ dragging, setDragging ] = useState(false);
  const [ error, setError ] = useState<string>();
  const [ pending, startTransition ] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const locked = postId === undefined || full;

  function upload(file: File | undefined){
    if(!file || postId === undefined){
      return;
    }

    // Проверка до запроса — не гонять 5 МБ ради отказа; сервер всё равно проверит содержимое
    if(!ACCEPTED_IMAGE_TYPES.includes(file.type)){
      return setError('Нужна картинка jpeg, png или webp');
    }

    if(file.size > uploadsConfig.maxBytes){
      return setError('Файл больше 5 МБ');
    }

    setError(undefined);
    startTransition(async () => {
      const uploaded = await uploadPostImageAction(postId, { file });
      const failed = uploaded?.serverError?.message ?? fieldError(uploaded?.validationErrors, 'file');

      if(failed || !uploaded?.data){
        return setError(failed ?? 'Не удалось загрузить');
      }

      const made = await setPostCoverAction(uploaded.data.id);
      setError(made?.serverError?.message);
    });
  }

  return (
    <Input.Wrapper label="Обложка" error={error}>
      { cover ? (
        <div className="ui-cover-field">
          <img src={imageUrl(cover.fileKey, 800)} width={cover.width} height={cover.height} alt="Обложка поста" />
          { !locked && <Button
            size="compact-sm"
            variant="default"
            className="ui-cover-field__replace"
            leftSection={<IconReplace size={15} />}
            loading={pending}
            onClick={() => input.current?.click()}
          >
            Другая обложка
          </Button> }
        </div>
      ) : (
        <div
          className="ui-cover-drop"
          data-dragging={dragging || undefined}
          data-locked={locked || undefined}
          data-pending={pending || undefined}
          role={locked ? undefined : 'button'}
          tabIndex={locked ? undefined : 0}
          onClick={() => !locked && !pending && input.current?.click()}
          onKeyDown={e => { if(!locked && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); input.current?.click() } }}
          onDragOver={e => { if(!locked){ e.preventDefault(); setDragging(true) } }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { if(!locked){ e.preventDefault(); setDragging(false); upload(e.dataTransfer.files[0]) } }}
        >
          <span className="ui-cover-drop__icon"><IconPhotoPlus size={22} stroke={1.8} /></span>
          { postId === undefined ? <>
            <b>Обложку можно добавить после сохранения</b>
            <small>Сохраните черновик — откроются обложка и фото к посту</small>
          </> : <>
            <b>{ pending ? 'Загружаем…' : 'Перетащите фото или выберите файл' }</b>
            <small>JPG, PNG или WebP до 5 МБ · лучше горизонтальное</small>
          </> }
        </div>
      ) }
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        hidden
        aria-label="Файл обложки"
        onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }}
      />
    </Input.Wrapper>
  );
}
