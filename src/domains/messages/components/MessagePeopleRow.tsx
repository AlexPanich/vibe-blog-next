'use client'

import 'client-only';
import { ignoreMessagesAction, restrictMessagesAction } from "@/domains/messages/actions/messageSettingsActions";
import type { MessagePeerResource } from "@/domains/messages/dto/messageResources";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { Button, Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useRouter } from "next/navigation";

type MessagePeopleRowProps = {
  // Из списка MessengerSide — уже отфильтрован ресурсом в layout
  peer: MessagePeerResource,
  kind: 'ignored' | 'restricted'
}

// Строка вкладок «Скрытые» и «Ограниченные»: возврат снимает связь, layout перечитывает списки
export default function MessagePeopleRow({ peer, kind }: MessagePeopleRowProps) {
  const router = useRouter();
  const done = { onSuccess: () => router.refresh() };
  const unignore = useAction(ignoreMessagesAction.bind(null, peer.id), done);
  const unrestrict = useAction(restrictMessagesAction.bind(null, peer.id), done);
  const action = kind === 'ignored' ? unignore : unrestrict;

  return (
    <div className="ui-chat-row ui-chat-row--static">
      <UserAvatar name={peer.name} avatarKey={peer.avatarKey} size={44} />
      <span className="ui-chat-row__body">
        <Link href={`/authors/${peer.id}`} className="ui-chat-row__name">{ peer.name }</Link>
        { action.result.serverError && <Text size="xs" c="red">{ action.result.serverError.message }</Text> }
      </span>
      <Button
        size="compact-sm"
        variant="default"
        radius="xl"
        loading={action.isPending}
        onClick={() => kind === 'ignored' ? unignore.execute({ ignore: false }) : unrestrict.execute({ restrict: false })}
      >
        { kind === 'ignored' ? 'Вернуть' : 'Разрешить' }
      </Button>
    </div>
  );
}
