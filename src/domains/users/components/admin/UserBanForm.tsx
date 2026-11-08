'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { UserBanFormResource } from "@/domains/users/dto/userResources";
import { banUserAction, unbanUserAction } from "@/domains/users/actions/userAdminActions";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Button, Textarea } from "@mantine/core";
import { IconBan, IconLockOpen, type Icon } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type UserBanFormProps<T extends UserBanFormResource> = {
  user: StrictResource<T, UserBanFormResource>,
  mode: 'ban' | 'unban'
}

/*
  Бан с обязательной причиной (пользователь увидит её при входе) и разбан с необязательным
  комментарием для журнала (спека 42, шаг 19). Срока блокировки нет — спека 46
*/
export default function UserBanForm<T extends UserBanFormResource>({ user, mode }: UserBanFormProps<T>) {
  const { action: serverAction, label, placeholder, button, icon: ButtonIcon, color } = MODES[mode];
  const action = useAction(serverAction.bind(null, user.id));
  const form = useForm({ comment: '' });
  const serverError = action.result.serverError?.message;

  return (
    <form className="ui-user-ban" onSubmit={e => { e.preventDefault(); action.execute(form.data) }}>
      <Textarea
        label={label}
        placeholder={placeholder}
        autosize
        minRows={3}
        maxRows={8}
        {...form.nv('comment')}
        onChange={e => form.update('comment', e.target.value)}
        error={fieldError(action.result.validationErrors, 'comment')}
      />
      { serverError && <p className="ui-user-card__error" role="alert">{ serverError }</p> }
      <Button
        type="submit"
        fullWidth
        color={color}
        leftSection={<ButtonIcon size={16} stroke={2} />}
        loading={action.isPending}
      >
        { button }
      </Button>
    </form>
  );
}

type ModeConfig = {
  action: typeof banUserAction,
  label: string,
  placeholder: string,
  button: string,
  icon: Icon,
  color: string
}

const MODES: Record<UserBanFormProps<UserBanFormResource>['mode'], ModeConfig> = {
  ban: {
    action: banUserAction,
    label: 'Причина',
    placeholder: 'Пользователь увидит её при попытке входа',
    button: 'Заблокировать',
    icon: IconBan,
    color: 'coral'
  },
  unban: {
    action: unbanUserAction,
    label: 'Комментарий',
    placeholder: 'Необязательно — попадёт в журнал',
    button: 'Разблокировать',
    icon: IconLockOpen,
    color: 'mint'
  },
};
