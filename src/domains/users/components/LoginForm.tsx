'use client'

import 'client-only';
import { useAction } from "next-safe-action/hooks";
import { resendVerificationAction, signinAction } from "@/domains/users/actions/authActions";
import useForm from "@/hooks/useForm";
import { UserSigninDto } from "@/domains/users/dto/authRequests";
import { fieldError } from "@/components/general/FieldError";
import { signIn } from "@/globals/authClient";
import { Alert, Button, Divider, PasswordInput, Stack, TextInput } from "@mantine/core";
import Link from "@/components/general/Link";
import LocalDate from "@/components/general/LocalDate";
import { IconBrandGithub, IconLock, IconLogin, IconMail, IconMailForward } from "@tabler/icons-react";

export default function LoginForm() {
  const action = useAction(signinAction);
  const resend = useAction(resendVerificationAction);
  const errors = action.result.validationErrors ?? resend.result.validationErrors;
  const notVerified = action.result.serverError?.code === 403;
  // Бан (423): срок форматируется здесь, в часовом поясе браузера (спека 46)
  const ban = action.result.serverError?.code === 423 ? action.result.serverError.ban : undefined;
  const { nv, update, data } = useForm<UserSigninDto>({
    email: '',
    password: ''
  });

  return (
    <Stack>
      { action.result.serverError && <Alert color="red">
        { ban?.until
          ? <>Аккаунт заблокирован до <LocalDate value={new Date(ban.until)} options={{ day: 'numeric', month: 'long' }} />: { ban.reason }</>
          : action.result.serverError.message }
      </Alert> }
      { notVerified && !resend.result.data?.sent && <Button
        type="button"
        variant="light"
        loading={resend.isPending}
        leftSection={<IconMailForward size={18} />}
        onClick={() => resend.execute(data)}
      >
        Отправить письмо повторно
      </Button> }
      { resend.result.data?.sent && <Alert color="green">
        Письмо отправлено, проверьте почту
      </Alert> }
      { resend.result.serverError && <Alert color="red">
        { resend.result.serverError.message }
      </Alert> }
      <form onSubmit={e => { e.preventDefault(); resend.reset(); action.execute(data) }}>
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
          <Link href="/auth/forgot-password" className="ui-meta">Забыли пароль?</Link>
          <Button type="submit" loading={action.isPending} leftSection={<IconLogin size={18} />}>
            Войти
          </Button>
        </Stack>
      </form>
      <Divider label="или" labelPosition="center" />
      <Button
        type="button"
        variant="default"
        leftSection={<IconBrandGithub size={18} />}
        onClick={() => signIn.social({
          provider: 'github',
          callbackURL: `/office`
        })}
      >
        Войти через GitHub
      </Button>
    </Stack>
  );
}
