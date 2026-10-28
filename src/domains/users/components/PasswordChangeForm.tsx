'use client'

import 'client-only';
import { useAction } from "next-safe-action/hooks";
import { changePasswordAction } from "@/domains/users/actions/userAccountActions";
import { ChangePasswordDto } from "@/domains/users/dto/authRequests";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Alert, Button, PasswordInput, Stack } from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";

// Смена пароля в профиле. После успеха поля очищаются, текущая сессия остаётся.
export default function PasswordChangeForm() {
  const { nv, update, data } = useForm<ChangePasswordDto>({ current: '', password: '', confirm: '' });
  const action = useAction(changePasswordAction, {
    onSuccess: () => { update('current', ''); update('password', ''); update('confirm', '') }
  });
  const errors = action.result.validationErrors;

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute(data) }}>
      <Stack>
        { action.result.data?.done && <Alert color="green">Пароль изменён. Другие устройства вышли из аккаунта.</Alert> }
        { action.result.serverError && <Alert color="red">{ action.result.serverError.message }</Alert> }
        <PasswordInput
          label="Текущий пароль"
          autoComplete="current-password"
          {...nv('current')}
          onChange={e => update('current', e.target.value)}
          error={fieldError(errors, 'current')}
        />
        <PasswordInput
          label="Новый пароль"
          description="От 8 до 64 символов"
          autoComplete="new-password"
          {...nv('password')}
          onChange={e => update('password', e.target.value)}
          error={fieldError(errors, 'password')}
        />
        <PasswordInput
          label="Повторите пароль"
          autoComplete="new-password"
          {...nv('confirm')}
          onChange={e => update('confirm', e.target.value)}
          error={fieldError(errors, 'confirm')}
        />
        <div>
          <Button type="submit" loading={action.isPending} leftSection={<IconDeviceFloppy size={16} />}>
            Сменить пароль
          </Button>
        </div>
      </Stack>
    </form>
  );
}
