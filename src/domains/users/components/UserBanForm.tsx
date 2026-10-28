'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { UserBanFormResource } from "@/domains/users/dto/userResources";
import { banUserAction, unbanUserAction } from "@/domains/users/actions/userAdminActions";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Button, Stack, Text, Textarea } from "@mantine/core";
import { IconLock, IconLockOpen, type Icon } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type UserBanFormProps<T extends UserBanFormResource> = {
  user: StrictResource<T, UserBanFormResource>,
  mode: 'ban' | 'unban'
}

// Бан с обязательной причиной (пользователь увидит её при входе) и разбан.
export default function UserBanForm<T extends UserBanFormResource>({ user, mode }: UserBanFormProps<T>) {
  const { action: serverAction, label, description, button, icon: ButtonIcon, color, variant } = MODES[mode];
  const action = useAction(serverAction.bind(null, user.id));
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
  action: typeof banUserAction,
  label: string,
  description: string,
  button: string,
  icon: Icon,
  color: string,
  variant: 'filled' | 'light'
}

const MODES: Record<UserBanFormProps<UserBanFormResource>['mode'], ModeConfig> = {
  ban: {
    action: banUserAction,
    label: 'Причина блокировки',
    description: 'Обязательна — пользователь увидит её при попытке входа. Все сессии пользователя завершатся',
    button: 'Заблокировать',
    icon: IconLock,
    color: 'red',
    variant: 'light'
  },
  unban: {
    action: unbanUserAction,
    label: 'Комментарий',
    description: 'Необязателен, сохранится в журнале',
    button: 'Разблокировать',
    icon: IconLockOpen,
    color: 'green',
    variant: 'filled'
  },
};
