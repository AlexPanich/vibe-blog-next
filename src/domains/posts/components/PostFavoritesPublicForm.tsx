'use client'

import 'client-only';
import { updateFavoritesPublicAction } from "@/domains/posts/actions/postFavoriteActions";
import { Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

/*
  «Кто видит избранное» (спека 40) — две карточки-радио, сохраняется сразу по выбору.
  «Всем» — вкладка «Избранное · N» на странице автора
*/
export default function PostFavoritesPublicForm({ favoritesPublic: initial }: { favoritesPublic: boolean }) {
  const [ favoritesPublic, setFavoritesPublic ] = useState(initial);
  const action = useAction(updateFavoritesPublicAction, { onSuccess: ({ data }) => setFavoritesPublic(data.favoritesPublic) });
  // Пока запрос идёт, отмечен выбранный вариант, а не прежний
  const checked = action.isPending ? action.input?.favoritesPublic ?? favoritesPublic : favoritesPublic;

  return <>
    <div className="ui-account-options" role="radiogroup" aria-label="Кто видит избранное">
      { OPTIONS.map(option => (
        <button
          key={option.label}
          type="button"
          role="radio"
          className="ui-account-option"
          aria-checked={checked === option.favoritesPublic}
          disabled={action.isPending}
          onClick={() => checked !== option.favoritesPublic && action.execute({ favoritesPublic: option.favoritesPublic })}
        >
          <span className="ui-account-option__radio" aria-hidden />
          <span className="ui-account-option__text">
            <b>{ option.label }</b>
            <small>{ option.text }</small>
          </span>
        </button>
      )) }
    </div>
    <p className="ui-account-note">Видны только опубликованные посты.</p>
    { action.result.serverError && <Text size="sm" c="red" mt="xs">{ action.result.serverError.message }</Text> }
  </>
}

const OPTIONS = [
  { favoritesPublic: false, label: 'Только мне', text: 'Закладки видите только вы' },
  { favoritesPublic: true, label: 'Всем', text: 'Вкладка «Избранное» на вашей странице автора' },
];
