'use client'

import 'client-only';
import { useAction } from "next-safe-action/hooks";
import { changeEmailAction } from "@/domains/users/actions/userAccountActions";
import { ChangeEmailDto } from "@/domains/users/dto/authRequests";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Alert, Button, PasswordInput, Stack, TextInput } from "@mantine/core";
import { IconMail, IconMailForward } from "@tabler/icons-react";

// Смена email: адрес меняется, только когда по ссылке из письма на новый адрес перейдут.
export default function EmailChangeForm() {
  const { nv, update, data } = useForm<ChangeEmailDto>({ email: '', current: '' });
  const action = useAction(changeEmailAction, {
    onSuccess: () => { update('email', ''); update('current', '') }
  });
  const errors = action.result.validationErrors;
  const sentTo = action.result.data?.sentTo;

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute(data) }}>
      <Stack>
        { sentTo && <Alert color="green">
          Письмо отправлено на { sentTo }. Email сменится, когда вы перейдёте по ссылке — она действует час.
        </Alert> }
        { action.result.serverError && <Alert color="red">{ action.result.serverError.message }</Alert> }
        <TextInput
          label="Новый email"
          leftSection={<IconMail size={17} stroke={1.7} />}
          {...nv('email')}
          onChange={e => update('email', e.target.value)}
          error={fieldError(errors, 'email')}
        />
        <PasswordInput
          label="Текущий пароль"
          autoComplete="current-password"
          {...nv('current')}
          onChange={e => update('current', e.target.value)}
          error={fieldError(errors, 'current')}
        />
        <div>
          <Button type="submit" loading={action.isPending} leftSection={<IconMailForward size={16} />}>
            Сменить email
          </Button>
        </div>
      </Stack>
    </form>
  );
}
