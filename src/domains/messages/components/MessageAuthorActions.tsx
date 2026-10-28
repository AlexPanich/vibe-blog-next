'use client'

import 'client-only';
import ButtonLink from "@/components/general/ButtonLink";
import { messageStateAction } from "@/domains/messages/actions/messageActions";
import MessagePeerControls from "@/domains/messages/components/MessagePeerControls";
import useUser from "@/hooks/useUser";
import { Group, Text } from "@mantine/core";
import { IconMessage } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useEffect, useRef } from "react";

/*
  «Написать» и «Запретить писать» на странице автора. Состояние — после гидрации: публичная
  страница сессию на сервере не читает. Писать нельзя — кнопки нет, вместо неё причина
*/
export default function MessageAuthorActions({ authorId }: { authorId: number }) {
  const { user, ready } = useUser();
  const load = useAction(messageStateAction.bind(null, authorId));
  const { execute: loadState } = load;
  // execute меняется на каждом рендере — без метки эффект запрашивал бы по кругу
  const loadedFor = useRef<number | null>(null);
  const own = ready && user?.id === authorId;

  useEffect(() => {
    if(ready && user && !own && loadedFor.current !== user.id){
      loadedFor.current = user.id;
      loadState();
    }
  }, [ ready, user, own, loadState ]);

  if(!ready || own){
    return null;
  }

  if(!user){
    return <Text size="sm"><Link href="/auth/login">Войдите</Link>, чтобы написать сообщение.</Text>;
  }

  const state = load.result.data;

  if(!state){
    return null;
  }

  const href = state.dialogId ? `/office/messages/${state.dialogId}` as const : `/office/messages/new?to=${authorId}` as const;

  return (
    <Group gap="sm" className="ui-follow">
      { state.blockReason
        ? <Text size="sm" c="dimmed">{ state.blockReason }</Text>
        : <ButtonLink href={href} size="compact-sm" variant="light" leftSection={<IconMessage size={16} />}>Написать</ButtonLink> }
      <MessagePeerControls peerId={authorId} restricted={state.restricted} />
    </Group>
  );
}
