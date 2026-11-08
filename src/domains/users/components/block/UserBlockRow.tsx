'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { blockUserAction } from "@/domains/users/actions/userBlockActions";
import FollowPerson from "@/domains/users/components/follows/FollowPerson";
import type { UserBlockRowResource } from "@/domains/users/dto/userResources";
import { IconLockOpen } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type UserBlockRowProps<T extends UserBlockRowResource> = {
  row: StrictResource<T, UserBlockRowResource>
}

// Строка «Заблокированных»: разблокировка одним кликом; action обновляет страницу, и строка уходит
export default function UserBlockRow<T extends UserBlockRowResource>({ row }: UserBlockRowProps<T>) {
  const unblock = useAction(blockUserAction.bind(null, row.id));

  return (
    <FollowPerson
      person={row}
      error={unblock.result.serverError?.message}
      action={
        <button
          type="button"
          className="ui-pill ui-pill--outline ui-follow-person__button"
          disabled={unblock.isPending}
          onClick={() => unblock.execute({ block: false })}
        >
          <IconLockOpen size={15} stroke={1.8} /><span className="ui-pill__label">Разблокировать</span>
        </button>
      }
    />
  );
}
