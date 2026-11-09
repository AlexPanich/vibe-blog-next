'use client'

import 'client-only';
import { updateMessagesFromAction } from "@/domains/messages/actions/messageSettingsActions";
import { Resource } from "@/core/resource";
import { MessagesFrom } from "@/database/schema";
import { Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

/*
  «Кто может мне писать» (спека 45) — три карточки-радио, сохраняется сразу по выбору. Настройка
  закрывает только новые переписки: ответить в диалоге, где вы писали, можно всегда.
  moderator и admin настройку обходят
*/
export default function MessagesFromForm({ messagesFrom: initial }: { messagesFrom: Resource<MessagesFrom> }) {
  const [ messagesFrom, setMessagesFrom ] = useState<MessagesFrom>(initial);
  const action = useAction(updateMessagesFromAction, { onSuccess: ({ data }) => setMessagesFrom(data.messagesFrom) });
  // Пока запрос идёт, отмечен выбранный вариант, а не прежний
  const checked = action.isPending ? action.input?.messagesFrom ?? messagesFrom : messagesFrom;

  return <>
    <div className="ui-account-options" role="radiogroup" aria-label="Кто может мне писать">
      { OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          role="radio"
          className="ui-account-option"
          aria-checked={checked === option.value}
          disabled={action.isPending}
          onClick={() => checked !== option.value && action.execute({ messagesFrom: option.value })}
        >
          <span className="ui-account-option__radio" aria-hidden />
          <span className="ui-account-option__text">
            <b>{ option.label }</b>
            <small>{ option.text }</small>
          </span>
        </button>
      )) }
    </div>
    <p className="ui-account-note">Ответить вам можно всегда, если вы написали первым. Модераторы и администраторы могут написать всегда.</p>
    { action.result.serverError && <Text size="sm" c="red" mt="xs">{ action.result.serverError.message }</Text> }
  </>
}

const OPTIONS: { value: MessagesFrom, label: string, text: string }[] = [
  { value: 'all', label: 'Все', text: 'Любой пользователь' },
  { value: 'following', label: 'Мои подписки', text: 'Те, на кого вы подписаны' },
  { value: 'nobody', label: 'Никто', text: 'Новые переписки закрыты' },
];
