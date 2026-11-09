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
import { BAN_TERM_KEYS, BAN_TERMS, DEFAULT_BAN_TERM, type BanTerm } from "@/domains/users/shared/banTerms";

type UserBanFormProps<T extends UserBanFormResource> = {
  user: StrictResource<T, UserBanFormResource>,
  mode: 'ban' | 'unban'
}

/*
  Бан с обязательной причиной (пользователь увидит её при входе) и разбан с необязательным
  комментарием для журнала (спека 42, шаг 19). У бана — срок пилюлями, по умолчанию 7 дней
  (спека 46): форма передаёт только ключ, момент окончания считает action
*/
export default function UserBanForm<T extends UserBanFormResource>({ user, mode }: UserBanFormProps<T>) {
  const { action: serverAction, label, placeholder, button, icon: ButtonIcon, color } = MODES[mode];
  const action = useAction(serverAction.bind(null, user.id));
  const form = useForm<{ comment: string, term: BanTerm }>({ comment: '', term: DEFAULT_BAN_TERM });
  const serverError = action.result.serverError?.message;

  return (
    <form className="ui-user-ban" onSubmit={e => { e.preventDefault(); action.execute(form.data) }}>
      { mode === 'ban' && <div className="ui-user-ban__terms" role="radiogroup" aria-label="Срок блокировки">
        { BAN_TERM_KEYS.map(term => (
          <button
            key={term}
            type="button"
            role="radio"
            className="ui-user-ban__term"
            aria-checked={form.data.term === term}
            onClick={() => form.update('term', term)}
          >
            { BAN_TERMS[term].label }
          </button>
        )) }
      </div> }
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
