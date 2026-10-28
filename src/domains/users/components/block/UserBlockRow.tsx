'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { blockUserAction } from "@/domains/users/actions/userBlockActions";
import UserAvatar from "@/domains/users/components/UserAvatar";
import type { UserBlockRowResource } from "@/domains/users/dto/userResources";
import { Button, Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";

type UserBlockRowProps<T extends UserBlockRowResource> = {
  row: StrictResource<T, UserBlockRowResource>
}

// Строка «Заблокированных»: разблокировка одним кликом; action обновляет страницу, и строка уходит
export default function UserBlockRow<T extends UserBlockRowResource>({ row }: UserBlockRowProps<T>) {
  const unblock = useAction(blockUserAction.bind(null, row.id));

  return (
    <div className="ui-row ui-row--static">
      <div className="ui-row__body">
        <Link href={`/authors/${row.id}`} className="ui-follow-row">
          <UserAvatar name={row.name} avatarKey={row.avatarKey} size={32} />{ row.name }
        </Link>
        { unblock.result.serverError && <Text size="sm" c="red">{ unblock.result.serverError.message }</Text> }
      </div>
      <div className="ui-row__aside ui-row__aside--inline">
        <Button size="compact-sm" variant="default" loading={unblock.isPending} onClick={() => unblock.execute({ block: false })}>
          Разблокировать
        </Button>
      </div>
    </div>
  );
}
