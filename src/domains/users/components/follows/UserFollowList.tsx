'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import UserFollowRow from "@/domains/users/components/follows/UserFollowRow";
import type { UserFollowRowListResource } from "@/domains/users/dto/userResources";
import { useState } from "react";

type UserFollowListProps<T extends UserFollowRowListResource> = {
  rows: StrictResource<T, UserFollowRowListResource>
}

/*
  Список «Подписок» / «Подписчиков». Action подписки перечитывает страницу (revalidatePath),
  и отписанный пропал бы из списка — вернуть его было бы нечем. Поэтому список — снимок на
  момент открытия вкладки: строка остаётся с «Подписаться снова», число на вкладке — свежее.
  Страница ставит key по вкладке, чтобы снимок не переезжал на другую
*/
export default function UserFollowList<T extends UserFollowRowListResource>({ rows }: UserFollowListProps<T>) {
  const [ snapshot ] = useState(rows);

  return (
    <ul className="ui-follow-list">
      { snapshot.map(row => <UserFollowRow key={row.id} row={row} />) }
    </ul>
  );
}
