'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { ignoreMessagesAction, restrictMessagesAction } from "@/domains/messages/actions/messageSettingsActions";
import type { MessagePeerResource } from "@/domains/messages/dto/messageResources";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { Button, Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MessagePeopleRowProps<T extends MessagePeerResource> = {
  peer: StrictResource<T, MessagePeerResource>,
  kind: 'ignored' | 'restricted'
}

// Строка вкладок «Скрытые» и «Ограниченные»: возврат снимает связь, строка уходит из списка
export default function MessagePeopleRow<T extends MessagePeerResource>({ peer, kind }: MessagePeopleRowProps<T>) {
  const router = useRouter();
  const done = { onSuccess: () => router.refresh() };
  const unignore = useAction(ignoreMessagesAction.bind(null, peer.id), done);
  const unrestrict = useAction(restrictMessagesAction.bind(null, peer.id), done);
  const action = kind === 'ignored' ? unignore : unrestrict;

  return (
    <div className="ui-row ui-row--static">
      <div className="ui-row__body">
        <Link href={`/authors/${peer.id}`} className="ui-follow-row">
          <UserAvatar name={peer.name} avatarKey={peer.avatarKey} size={32} />{ peer.name }
        </Link>
        { action.result.serverError && <Text size="sm" c="red">{ action.result.serverError.message }</Text> }
      </div>
      <div className="ui-row__aside ui-row__aside--inline">
        <Button
          size="compact-sm"
          variant="default"
          loading={action.isPending}
          onClick={() => kind === 'ignored' ? unignore.execute({ ignore: false }) : unrestrict.execute({ restrict: false })}
        >
          { kind === 'ignored' ? 'Вернуть в список' : 'Разрешить писать' }
        </Button>
      </div>
    </div>
  );
}
