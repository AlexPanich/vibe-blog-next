'use client'

import 'client-only';
import { ACCEPTED_IMAGE_TYPES } from "@/core/imageUrl";
import { uploadsConfig } from "@/config/uploads";
import { removeAvatarAction, uploadAvatarAction } from "@/domains/users/actions/userAccountActions";
import UserAvatar from "@/domains/users/components/UserAvatar";
import { fieldError } from "@/components/general/FieldError";
import { Button, Group, Stack, Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type AvatarFormProps = {
  name: string,
  avatarKey: string | null
}

// Свой аватар: загрузка (обрезка в квадрат — на сервере) и удаление.
export default function AvatarForm({ name, avatarKey }: AvatarFormProps) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [ clientError, setClientError ] = useState<string>();
  const [ confirming, setConfirming ] = useState(false);
  // refresh: layout кабинета перечитает сессию, и шапка возьмёт новый ключ
  const upload = useAction(uploadAvatarAction, { onSuccess: () => router.refresh() });
  const remove = useAction(removeAvatarAction, { onSuccess: () => { setConfirming(false); router.refresh() } });
  const error = clientError ?? fieldError(upload.result.validationErrors, 'file') ?? upload.result.serverError?.message ?? remove.result.serverError?.message;

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
    <Stack gap="sm">
      <Group gap="md">
        <UserAvatar name={name} avatarKey={avatarKey} size={96} />
        <Stack gap={6}>
          <Group gap="xs">
            <Button size="sm" variant="light" loading={upload.isPending} onClick={() => input.current?.click()}>
              { avatarKey ? 'Заменить' : 'Загрузить' }
            </Button>
            { avatarKey && !confirming && <Button size="sm" variant="subtle" color="red" onClick={() => setConfirming(true)}>Удалить</Button> }
            { confirming && <>
              <Button size="sm" color="red" loading={remove.isPending} onClick={() => remove.execute()}>Удалить аватар</Button>
              <Button size="sm" variant="subtle" color="gray" onClick={() => setConfirming(false)}>Отмена</Button>
            </> }
          </Group>
          <Text size="xs" c="dimmed">jpeg, png или webp до 5 МБ, обрежется в квадрат по центру</Text>
        </Stack>
      </Group>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        hidden
        aria-label="Файл аватара"
        onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }}
      />
      { error && <Text size="sm" c="red">{ error }</Text> }
    </Stack>
  );
}
