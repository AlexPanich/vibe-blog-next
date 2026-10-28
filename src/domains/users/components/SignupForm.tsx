'use client'

import 'client-only';
import { useAction } from "next-safe-action/hooks";
import { signupAction } from "@/domains/users/actions/authActions";
import useForm from "@/hooks/useForm";
import { UserSignupDto } from "@/domains/users/dto/authRequests";
import { fieldError } from "@/components/general/FieldError";
import { Button, PasswordInput, Stack, TextInput } from "@mantine/core";
import { IconLock, IconMail, IconUser, IconUserPlus } from "@tabler/icons-react";

export default function SignupForm() {
  const action = useAction(signupAction);
  const errors = action.result.validationErrors;
  const { nv, update, data } = useForm<UserSignupDto>({
    email: '',
    password: '',
    name: ''
  });

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute(data) }}>
      <Stack>
        <TextInput
          label="Email"
          leftSection={<IconMail size={17} stroke={1.7} />}
          {...nv('email')}
          onChange={e => update('email', e.target.value)}
          error={fieldError(errors, 'email')}
        />
        <PasswordInput
          label="Пароль"
          leftSection={<IconLock size={17} stroke={1.7} />}
          {...nv('password')}
          onChange={e => update('password', e.target.value)}
          error={fieldError(errors, 'password')}
        />
        <TextInput
          label="Имя"
          leftSection={<IconUser size={17} stroke={1.7} />}
          {...nv('name')}
          onChange={e => update('name', e.target.value)}
          error={fieldError(errors, 'name')}
        />
        <Button type="submit" loading={action.isPending} leftSection={<IconUserPlus size={18} />}>
          Зарегистрироваться
        </Button>
      </Stack>
    </form>
  );
}
