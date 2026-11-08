'use client'

import 'client-only';
import { updateMessagesFriendsOnlyAction } from "@/domains/messages/actions/messageSettingsActions";
import { Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

/*
  «Кто может мне писать» — две карточки-радио, сохраняется сразу по выбору. «Только друзья» —
  взаимные подписчики; moderator и admin могут написать всегда. Три варианта — спека 45
*/
export default function MessagesFriendsOnlyForm({ friendsOnly: initial }: { friendsOnly: boolean }) {
  const [ friendsOnly, setFriendsOnly ] = useState(initial);
  const action = useAction(updateMessagesFriendsOnlyAction, { onSuccess: ({ data }) => setFriendsOnly(data.friendsOnly) });
  // Пока запрос идёт, отмечен выбранный вариант, а не прежний
  const checked = action.isPending ? action.input?.friendsOnly ?? friendsOnly : friendsOnly;

  return <>
    <div className="ui-account-options" role="radiogroup" aria-label="Кто может мне писать">
      { OPTIONS.map(option => (
        <button
          key={option.label}
          type="button"
          role="radio"
          className="ui-account-option"
          aria-checked={checked === option.friendsOnly}
          disabled={action.isPending}
          onClick={() => checked !== option.friendsOnly && action.execute({ friendsOnly: option.friendsOnly })}
        >
          <span className="ui-account-option__radio" aria-hidden />
          <span className="ui-account-option__text">
            <b>{ option.label }</b>
            <small>{ option.text }</small>
          </span>
        </button>
      )) }
    </div>
    <p className="ui-account-note">Модераторы и администраторы могут написать всегда.</p>
    { action.result.serverError && <Text size="sm" c="red" mt="xs">{ action.result.serverError.message }</Text> }
  </>
}

const OPTIONS = [
  { friendsOnly: false, label: 'Все', text: 'Любой пользователь' },
  { friendsOnly: true, label: 'Только друзья', text: 'Те, с кем вы подписаны друг на друга' },
];
