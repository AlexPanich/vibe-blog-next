'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { PostTransitionsResource } from "@/domains/posts/dto/postResources";
import { PostOwnerTransition } from "@/domains/posts/shared/postStatuses";
import {
  archivePostAction,
  restorePostAction,
  submitPostAction,
  unpublishPostAction,
  withdrawPostAction
} from "@/domains/posts/actions/postStatusActions";
import { Button, type ButtonProps } from "@mantine/core";
import { IconArchive, IconArrowBackUp, IconEyeOff, IconRestore, IconSend, type Icon } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type PostTransitionButtonsProps<T extends PostTransitionsResource> = {
  post: StrictResource<T, PostTransitionsResource>
}

// Кнопки переходов автора: набор приходит с сервера, он уже учитывает статус и права.
export default function PostTransitionButtons<T extends PostTransitionsResource>({ post }: PostTransitionButtonsProps<T>) {
  return <>
    { post.transitions.map(t => <TransitionButton key={t} id={post.id} transition={t} />) }
  </>
}

type ButtonConfig = {
  action: typeof submitPostAction,
  label: string,
  icon: Icon,
  variant: ButtonProps['variant'],
  color?: string
}

const BUTTONS: Record<PostOwnerTransition, ButtonConfig> = {
  submit:    { action: submitPostAction,    label: 'Отправить на модерацию', icon: IconSend,        variant: 'filled' },
  withdraw:  { action: withdrawPostAction,  label: 'Отозвать',               icon: IconArrowBackUp, variant: 'default' },
  unpublish: { action: unpublishPostAction, label: 'Снять с публикации',     icon: IconEyeOff,      variant: 'default' },
  archive:   { action: archivePostAction,   label: 'В архив',                icon: IconArchive,     variant: 'light', color: 'red' },
  restore:   { action: restorePostAction,   label: 'Восстановить',           icon: IconRestore,     variant: 'filled' },
};

function TransitionButton({ id, transition }: { id: number, transition: PostOwnerTransition }) {
  const { action: serverAction, label, icon: ButtonIcon, variant, color } = BUTTONS[transition];
  const action = useAction(serverAction.bind(null, id));
  const error = action.result.serverError?.message;

  return (
    <Button
      variant={variant}
      color={error ? 'red' : color}
      leftSection={<ButtonIcon size={16} />}
      loading={action.isPending}
      title={error}
      onClick={() => action.execute()}
    >
      { error ?? label }
    </Button>
  );
}
