'use client'

import 'client-only';
import { useAction } from "next-safe-action/hooks";
import { requestPasswordResetAction } from "@/domains/users/actions/authActions";
import { ForgotPasswordDto } from "@/domains/users/dto/authRequests";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Alert, Button, Stack, TextInput } from "@mantine/core";
import { IconMail, IconMailForward } from "@tabler/icons-react";

// Запрос письма сброса. Ответ всегда одинаковый — есть такой email или нет.
export default function ForgotPasswordForm() {
  const action = useAction(requestPasswordResetAction);
  const { nv, update, data } = useForm<ForgotPasswordDto>({ email: '' });

  if(action.result.data?.sent){
    return <Alert color="green">
      Если такой email зарегистрирован, мы отправили письмо со ссылкой. Она действует час.
    </Alert>;
  }

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute(data) }}>
      <Stack>
        { action.result.serverError && <Alert color="red">{ action.result.serverError.message }</Alert> }
        <TextInput
          label="Email"
          description="Тот, с которым вы регистрировались"
          leftSection={<IconMail size={17} stroke={1.7} />}
          {...nv('email')}
          onChange={e => update('email', e.target.value)}
          error={fieldError(action.result.validationErrors, 'email')}
        />
        <Button type="submit" loading={action.isPending} leftSection={<IconMailForward size={18} />}>
          Отправить ссылку
        </Button>
      </Stack>
    </form>
  );
}
