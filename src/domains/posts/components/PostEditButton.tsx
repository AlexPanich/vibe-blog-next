'use client'

import 'client-only';
import type { PostEditStartDto } from "@/domains/posts/dto/postRequests";
import { editPostAction } from "@/domains/posts/actions/postStatusActions";
import { Button, Group, Modal, Text } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type NotDraft = PostEditStartDto['status']

// Что станет с постом — а не что запрещено (спека 25)
const CONFIRM_TEXTS: Record<NotDraft, string> = {
  published: 'Пост вернётся в черновик и пропадёт из ленты, пока модератор не одобрит его снова. Оценки и комментарии сохранятся.',
  moderating: 'Пост вернётся в черновик и уйдёт из очереди модерации. Если модератор уже взял его на ревью, ревью снимется.',
  rejected: 'Пост вернётся в черновик — после правки отправьте его на модерацию снова.',
  blocked: 'Пост вернётся в черновик — после правки отправьте его на модерацию снова.',
  hidden: 'Пост вернётся из архива в черновик. После правки он пройдёт модерацию, а не вернётся в ленту сразу.',
};

/*
  «Изменить» у поста не в черновике: подтверждение, затем editPostAction переводит пост в
  черновик и открывает форму. Черновику кнопка не нужна — у него обычная ссылка на форму
*/
export default function PostEditButton({ id, status }: { id: number, status: NotDraft }) {
  const [ confirming, setConfirming ] = useState(false);
  const edit = useAction(editPostAction.bind(null, id));

  return <>
    <Button variant="default" leftSection={<IconPencil size={16} />} onClick={() => setConfirming(true)}>
      Изменить
    </Button>

    <Modal opened={confirming} onClose={() => setConfirming(false)} title="Изменить пост?">
      <Text size="sm" mb="md">{ CONFIRM_TEXTS[status] }</Text>
      { edit.result.serverError && <Text size="sm" c="red" mb="md">{ edit.result.serverError.message }</Text> }
      <Group justify="flex-end">
        <Button variant="default" onClick={() => setConfirming(false)}>Отмена</Button>
        <Button loading={edit.isPending} onClick={() => edit.execute({ status })}>Править</Button>
      </Group>
    </Modal>
  </>
}
