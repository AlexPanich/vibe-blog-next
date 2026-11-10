'use client'

import 'client-only';
import { createAuthorRequestAction } from "@/domains/users/actions/authorRequestActions";
import { AUTHOR_REQUEST_PAUSE_DAYS, AUTHOR_REQUEST_TEXT_MAX } from "@/domains/users/dto/authorRequestRequests";
import { AUTHOR_REQUEST_LINK_MAX } from "@/domains/users/shared/authorRequestLink";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Button, Text, TextInput, Textarea } from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

/*
  Заявка на роль автора: текст и необязательная ссылка «Где почитать ваши тексты»
  (спека 48), решение — у администратора
*/
export default function AuthorRequestForm() {
  const action = useAction(createAuthorRequestAction);
  const form = useForm({ text: '', link: '' });
  const serverError = action.result.serverError?.message;

  return (
    <form className="ui-request-card" onSubmit={e => { e.preventDefault(); action.execute(form.data) }}>
      <h2 className="ui-request-card__title">Новая заявка</h2>
      <Textarea
        label={<span className="ui-account-count">О чём хотите писать? <small>{ form.data.text.length } / { AUTHOR_REQUEST_TEXT_MAX }</small></span>}
        labelProps={{ className: 'ui-account-count__label' }}
        placeholder="Например: веду походы по Кавказу пять лет, хочу рассказывать о маршрутах для новичков…"
        autosize
        minRows={5}
        radius={14}
        maxLength={AUTHOR_REQUEST_TEXT_MAX}
        {...form.nv('text')}
        onChange={e => form.update('text', e.target.value)}
        error={fieldError(action.result.validationErrors, 'text')}
      />
      <TextInput
        label={<span className="ui-account-count">Где почитать ваши тексты <small>необязательно</small></span>}
        labelProps={{ className: 'ui-account-count__label' }}
        placeholder="t.me/name или ссылка на блог"
        radius={14}
        maxLength={AUTHOR_REQUEST_LINK_MAX}
        {...form.nv('link')}
        onChange={e => form.update('link', e.target.value)}
        error={fieldError(action.result.validationErrors, 'link')}
      />
      { serverError && <Text c="red" size="sm">{ serverError }</Text> }
      <div className="ui-request-card__foot">
        <p className="ui-request-card__hint">Новую заявку после отказа можно подать через { AUTHOR_REQUEST_PAUSE_DAYS } дней</p>
        <Button type="submit" radius="xl" leftSection={<IconSend size={16} />} loading={action.isPending}>
          Отправить заявку
        </Button>
      </div>
    </form>
  );
}
