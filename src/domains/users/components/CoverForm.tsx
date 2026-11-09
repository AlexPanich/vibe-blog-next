'use client'

import 'client-only';
import { ACCEPTED_IMAGE_TYPES, imageUrl } from "@/core/imageUrl";
import { uploadsConfig } from "@/config/uploads";
import { removeCoverAction, uploadCoverAction } from "@/domains/users/actions/userAccountActions";
import type { AuthorCover } from "@/domains/users/shared/authorCover";
import { authorTone } from "@/domains/users/shared/authorTone";
import { fieldError } from "@/components/general/FieldError";
import { Button, Group, Text } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type CoverFormProps = {
  authorId: number,
  coverKey: string | null,
  // Что видно на странице автора без своей обложки: обложка последнего поста или null — плашка
  fallback: AuthorCover | null
}

/*
  Своя обложка профиля (спека 41): превью полосой пропорций баннера, загрузка (варианты по
  ширине — на сервере, кадр — CSS по центру) и удаление. Устройство — как у AvatarForm
*/
export default function CoverForm({ authorId, coverKey, fallback }: CoverFormProps) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [ clientError, setClientError ] = useState<string>();
  const [ confirming, setConfirming ] = useState(false);
  const upload = useAction(uploadCoverAction, { onSuccess: () => router.refresh() });
  const remove = useAction(removeCoverAction, { onSuccess: () => { setConfirming(false); router.refresh() } });
  const error = clientError ?? fieldError(upload.result.validationErrors, 'file') ?? upload.result.serverError?.message ?? remove.result.serverError?.message;
  const shown = coverKey ?? fallback?.fileKey;

  function pick(file: File | undefined){
    setClientError(undefined);

    if(!file){
      return;
    }

    if(!ACCEPTED_IMAGE_TYPES.includes(file.type)){
      setClientError('Нужна картинка jpeg, png или webp');
    }
    else if(file.size > uploadsConfig.maxBytes){
      setClientError('Файл больше 5 МБ');
    }
    else{
      upload.execute({ file });
    }
  }

  return (
    <div className="ui-account-cover">
      <div className="ui-account-cover__band" data-tone={shown ? undefined : authorTone(authorId)}>
        { shown && <img src={imageUrl(shown, 800)} alt="" /> }
      </div>
      <Group gap="xs">
        <Button
          size="sm"
          className="ui-ink-button"
          leftSection={<IconUpload size={16} />}
          loading={upload.isPending}
          onClick={() => input.current?.click()}
        >
          { coverKey ? 'Заменить обложку' : 'Загрузить обложку' }
        </Button>
        { coverKey && !confirming && <Button size="sm" variant="default" onClick={() => setConfirming(true)}>Удалить</Button> }
        { confirming && <>
          <Button size="sm" color="red" loading={remove.isPending} onClick={() => remove.execute()}>Удалить обложку</Button>
          <Button size="sm" variant="subtle" color="gray" onClick={() => setConfirming(false)}>Отмена</Button>
        </> }
      </Group>
      <Text className="ui-account-cover__hint">jpeg, png или webp до 5 МБ — по краям обрежется, как на странице автора</Text>
      { !coverKey && <Text className="ui-account-cover__hint">
        { fallback ? 'Сейчас — обложка последнего поста' : 'Сейчас — цветная плашка' }
      </Text> }
      { error && <Text size="sm" c="red">{ error }</Text> }
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        hidden
        aria-label="Файл обложки"
        onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }}
      />
    </div>
  );
}
