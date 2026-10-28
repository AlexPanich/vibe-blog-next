'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { PostModerateResource } from "@/domains/posts/dto/postResources";
import { approvePostAction, rejectPostAction } from "@/domains/posts/actions/postModerationActions";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Button, Group, Stack, Text, Textarea } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type PostModerationFormProps<T extends PostModerateResource> = {
  post: StrictResource<T, PostModerateResource>
}

// Решение модератора: комментарий необязателен при одобрении и обязателен при отклонении.
export default function PostModerationForm<T extends PostModerateResource>({ post }: PostModerationFormProps<T>) {
  const approve = useAction(approvePostAction.bind(null, post.id));
  const reject = useAction(rejectPostAction.bind(null, post.id));
  const form = useForm({ comment: '' });
  const pending = approve.isPending || reject.isPending;
  const serverError = approve.result.serverError?.message ?? reject.result.serverError?.message;

  return (
    <form onSubmit={e => e.preventDefault()}>
      <Stack>
        <Textarea
          label="Комментарий модератора"
          description="Обязателен при отклонении — автор увидит его в кабинете"
          autosize
          minRows={3}
          {...form.nv('comment')}
          onChange={e => form.update('comment', e.target.value)}
          error={fieldError(reject.result.validationErrors, 'comment') ?? fieldError(approve.result.validationErrors, 'comment')}
        />
        { serverError && <Text c="red" size="sm">{ serverError }</Text> }
        <Group>
          <Button
            color="green"
            leftSection={<IconCheck size={16} />}
            loading={approve.isPending}
            disabled={pending && !approve.isPending}
            onClick={() => { reject.reset(); approve.execute(form.data) }}
          >
            Одобрить
          </Button>
          <Button
            variant="light"
            color="red"
            leftSection={<IconX size={16} />}
            loading={reject.isPending}
            disabled={pending && !reject.isPending}
            onClick={() => { approve.reset(); reject.execute(form.data) }}
          >
            Отклонить
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
