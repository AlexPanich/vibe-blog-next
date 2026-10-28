'use client'

import 'client-only';
import { useAction } from "next-safe-action/hooks";
import { resetPasswordAction } from "@/domains/users/actions/authActions";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Alert, Button, PasswordInput, Stack } from "@mantine/core";
import { IconDeviceFloppy, IconLock, IconLogin } from "@tabler/icons-react";
import Link from "next/link";

// Новый пароль по ссылке из письма. Токен приходит строкой из url — он и так у человека в адресной строке.
export default function ResetPasswordForm({ token }: { token: string }) {
  const action = useAction(resetPasswordAction);
  const { nv, update, data } = useForm({ password: '', confirm: '' });
  const errors = action.result.validationErrors;

  if(action.result.data?.done){
    return <Stack>
      <Alert color="green">Пароль изменён, войдите с новым паролем.</Alert>
      <Button component={Link} href="/auth/login" leftSection={<IconLogin size={18} />}>Войти</Button>
    </Stack>;
  }

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute({ token, ...data }) }}>
      <Stack>
        { action.result.serverError && <Alert color="red">
          { action.result.serverError.message }. <Link href="/auth/forgot-password">Запросить новую ссылку</Link>
        </Alert> }
        <PasswordInput
          label="Новый пароль"
          description="От 8 до 64 символов"
          leftSection={<IconLock size={17} stroke={1.7} />}
          autoComplete="new-password"
          {...nv('password')}
          onChange={e => update('password', e.target.value)}
          error={fieldError(errors, 'password')}
        />
        <PasswordInput
          label="Повторите пароль"
          leftSection={<IconLock size={17} stroke={1.7} />}
          autoComplete="new-password"
          {...nv('confirm')}
          onChange={e => update('confirm', e.target.value)}
          error={fieldError(errors, 'confirm')}
        />
        <Button type="submit" loading={action.isPending} leftSection={<IconDeviceFloppy size={18} />}>
          Сохранить пароль
        </Button>
      </Stack>
    </form>
  );
}
