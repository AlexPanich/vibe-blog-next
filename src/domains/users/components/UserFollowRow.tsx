'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { followUserAction } from "@/domains/users/actions/userFollowActions";
import UserAvatar from "@/domains/users/components/UserAvatar";
import type { UserFollowRowResource } from "@/domains/users/dto/userResources";
import { Button, Text } from "@mantine/core";
import { IconHeartHandshake } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useState } from "react";

type UserFollowRowProps<T extends UserFollowRowResource> = {
  row: StrictResource<T, UserFollowRowResource>
}

/*
  Строка «Подписок» и «Подписчиков». Состояние меняется на месте: отписка снимает «друга»,
  подписка в ответ сразу делает другом — без перезагрузки вкладки
*/
export default function UserFollowRow<T extends UserFollowRowResource>({ row }: UserFollowRowProps<T>) {
  const [ state, setState ] = useState({ following: row.following, friend: row.friend });
  const toggle = useAction(followUserAction.bind(null, row.id), {
    onSuccess: ({ data }) => setState({ following: data.following, friend: data.friend })
  });

  return (
    <div className="ui-row ui-row--static">
      <div className="ui-row__body">
        <Link href={`/authors/${row.id}`} className="ui-follow-row">
          <UserAvatar name={row.name} avatarKey={row.avatarKey} size={32} />{ row.name }
        </Link>
        { toggle.result.serverError && <Text size="sm" c="red">{ toggle.result.serverError.message }</Text> }
      </div>
      <div className="ui-row__aside ui-row__aside--inline">
        { state.friend && <span className="ui-tag ui-tag--friend"><IconHeartHandshake size={13} stroke={1.8} />друг</span> }
        <Button
          size="compact-sm"
          variant={state.following ? 'default' : 'light'}
          loading={toggle.isPending}
          onClick={() => toggle.execute({ follow: !state.following })}
        >
          { state.following ? 'Отписаться' : 'Подписаться в ответ' }
        </Button>
      </div>
    </div>
  );
}
