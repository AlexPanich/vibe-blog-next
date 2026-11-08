'use client'

import 'client-only';
import { followUserAction } from "@/domains/users/actions/userFollowActions";
import FollowPerson from "@/domains/users/components/follows/FollowPerson";
import type { UserFollowRowResource } from "@/domains/users/dto/userResources";
import { IconUserCheck, IconUserPlus } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

/*
  Строка «Подписок» и «Подписчиков» — внутри UserFollowList, ресурс проверяет он. Состояние
  меняется на месте: отписка снимает «друга», подписка в ответ сразу делает другом. «Вы подписаны» — та же кнопка, нажатие отписывает
  (как UserFollowButton на странице автора)
*/
export default function UserFollowRow({ row }: { row: UserFollowRowResource }) {
  const [ state, setState ] = useState({ following: row.following, friend: row.friend });
  const toggle = useAction(followUserAction.bind(null, row.id), {
    onSuccess: ({ data }) => setState({ following: data.following, friend: data.friend })
  });

  return (
    <FollowPerson
      person={row}
      friend={state.friend}
      error={toggle.result.serverError?.message}
      action={
        <button
          type="button"
          className="ui-pill ui-follow-person__button"
          data-following={state.following || undefined}
          disabled={toggle.isPending}
          title={state.following ? 'Отписаться' : undefined}
          onClick={() => toggle.execute({ follow: !state.following })}
        >
          { state.following
            ? <><IconUserCheck size={15} stroke={1.8} /><span className="ui-pill__label">Вы подписаны</span></>
            : <><IconUserPlus size={15} stroke={1.8} /><span className="ui-pill__label">{ row.following ? 'Подписаться снова' : 'Подписаться в ответ' }</span></> }
        </button>
      }
    />
  );
}
