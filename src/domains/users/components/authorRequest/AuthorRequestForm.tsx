'use client'

import 'client-only';
import { createAuthorRequestAction } from "@/domains/users/actions/authorRequestActions";
import { AUTHOR_REQUEST_PAUSE_DAYS, AUTHOR_REQUEST_TEXT_MAX } from "@/domains/users/dto/authorRequestRequests";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Button, Text, Textarea } from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

/*
  Заявка на роль автора: один текст, решение — у администратора. Поле «Где почитать ваши
  тексты» из макета — спека 48
*/
export default function AuthorRequestForm() {
  const action = useAction(createAuthorRequestAction);
  const form = useForm({ text: '' });
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
