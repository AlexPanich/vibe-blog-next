'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { PostModerateResource } from "@/domains/posts/dto/postResources";
import { blockPostAction, unblockPostAction } from "@/domains/posts/actions/postModerationActions";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Button, Stack, Text, Textarea } from "@mantine/core";
import { IconLock, IconLockOpen, type Icon } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type PostBlockingFormProps<T extends PostModerateResource> = {
  post: StrictResource<T, PostModerateResource>,
  mode: 'block' | 'unblock'
}

// Блокировка опубликованного или архивного поста (причина обязательна) и разблокировка.
export default function PostBlockingForm<T extends PostModerateResource>({ post, mode }: PostBlockingFormProps<T>) {
  const { action: serverAction, label, description, button, icon: ButtonIcon, color, variant } = MODES[mode];
  const action = useAction(serverAction.bind(null, post.id));
  const form = useForm({ comment: '' });
  const serverError = action.result.serverError?.message;

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute(form.data) }}>
      <Stack>
        <Textarea
          label={label}
          description={description}
          autosize
          minRows={3}
          {...form.nv('comment')}
          onChange={e => form.update('comment', e.target.value)}
          error={fieldError(action.result.validationErrors, 'comment')}
        />
        { serverError && <Text c="red" size="sm">{ serverError }</Text> }
        <div>
          <Button
            type="submit"
            variant={variant}
            color={color}
            leftSection={<ButtonIcon size={16} />}
            loading={action.isPending}
          >
            { button }
          </Button>
        </div>
      </Stack>
    </form>
  );
}

type ModeConfig = {
  action: typeof blockPostAction,
  label: string,
  description: string,
  button: string,
  icon: Icon,
  color: string,
  variant: 'filled' | 'light'
}

const MODES: Record<PostBlockingFormProps<PostModerateResource>['mode'], ModeConfig> = {
  block: {
    action: blockPostAction,
    label: 'Причина блокировки',
    description: 'Обязательна — автор увидит её в кабинете. Пост пропадёт из ленты',
    button: 'Заблокировать',
    icon: IconLock,
    color: 'red',
    variant: 'light'
  },
  unblock: {
    action: unblockPostAction,
    label: 'Комментарий модератора',
    description: 'Необязателен, сохранится в истории. Пост вернётся в ленту',
    button: 'Разблокировать',
    icon: IconLockOpen,
    color: 'green',
    variant: 'filled'
  },
};
