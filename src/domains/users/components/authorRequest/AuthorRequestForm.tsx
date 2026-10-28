'use client'

import 'client-only';
import { createAuthorRequestAction } from "@/domains/users/actions/authorRequestActions";
import { AUTHOR_REQUEST_TEXT_MAX, AUTHOR_REQUEST_TEXT_MIN } from "@/domains/users/dto/authorRequestRequests";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Button, Stack, Text, Textarea } from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

// Заявка на роль автора: один текст, решение — у администратора.
export default function AuthorRequestForm() {
  const action = useAction(createAuthorRequestAction);
  const form = useForm({ text: '' });
  const serverError = action.result.serverError?.message;
  const length = form.data.text.trim().length;

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute(form.data) }}>
      <Stack>
        <Textarea
          label="О чём хотите писать"
          description={`Темы, опыт, примеры — администратор решит по этому тексту. От ${AUTHOR_REQUEST_TEXT_MIN} до ${AUTHOR_REQUEST_TEXT_MAX} символов`}
          autosize
          minRows={4}
          maxLength={AUTHOR_REQUEST_TEXT_MAX}
          {...form.nv('text')}
          onChange={e => form.update('text', e.target.value)}
          error={fieldError(action.result.validationErrors, 'text')}
        />
        <Text size="xs" c="dimmed">{ length } / { AUTHOR_REQUEST_TEXT_MAX }</Text>
        { serverError && <Text c="red" size="sm">{ serverError }</Text> }
        <div>
          <Button type="submit" leftSection={<IconSend size={16} />} loading={action.isPending}>
            Отправить заявку
          </Button>
        </div>
      </Stack>
    </form>
  );
}
