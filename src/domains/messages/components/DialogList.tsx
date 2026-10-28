'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import { StrictResource } from "@/core/resource";
import { loadDialogsAction } from "@/domains/messages/actions/messageActions";
import MessagePeerControls from "@/domains/messages/components/MessagePeerControls";
import type { DialogRowResource } from "@/domains/messages/dto/messageResources";
import { messageSnippet } from "@/domains/messages/shared/messageSnippet";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import useLiveEvent from "@/hooks/useLiveEvent";
import { Button, Text } from "@mantine/core";
import { IconMessages } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useState } from "react";

type DialogListProps<T extends DialogRowResource[]> = {
  meId: number,
  dialogs: StrictResource<T, DialogRowResource[]>,
  hasMore: boolean
}

/*
  Список переписок, свежие сверху. Новое сообщение в показанном диалоге поднимает строку на
  месте; всё остальное (новый диалог, удаление, прочитано в другой вкладке) перечитывает
  первую порцию
*/
export default function DialogList<T extends DialogRowResource[]>({ meId, dialogs: initial, hasMore: initialHasMore }: DialogListProps<T>) {
  const [ rows, setRows ] = useState<DialogRowResource[]>(initial);
  const [ hasMore, setHasMore ] = useState(initialHasMore);
  const load = useAction(loadDialogsAction, {
    onSuccess: ({ data, input }) => {
      setRows(prev => input.beforeId === undefined ? data.items : [ ...prev, ...data.items.filter(d => !prev.some(p => p.id === d.id)) ]);
      setHasMore(data.hasMore);
    }
  });

  useLiveEvent('message.created', ({ dialogId, message }) => {
    const row = rows.find(r => r.id === dialogId);

    if(!row){
      load.execute({});
      return;
    }

    const mine = message.userId === meId;
    const updated = {
      ...row,
      lastMessage: { content: messageSnippet(message.content), mine },
      lastMessageAt: new Date(message.createdAt),
      unread: mine ? row.unread : row.unread + 1
    };

    setRows(prev => [ updated, ...prev.filter(r => r.id !== dialogId) ]);
  });

  useLiveEvent('message.deleted', () => load.execute({}));
  useLiveEvent('message.read', () => load.execute({}));
  useLiveEvent('open', () => load.execute({}));

  if(rows.length === 0){
    return (
      <EmptyState
        icon={IconMessages}
        title="Переписок пока нет"
        action={<ButtonLink href="/authors" variant="default">К авторам</ButtonLink>}
      >
        Написать можно со страницы автора — кнопка «Написать» рядом с подпиской.
      </EmptyState>
    );
  }

  const last = rows[rows.length - 1];

  return <>
    <div className="ui-rows">
      { rows.map(row => (
        <div key={row.id} className="ui-row ui-row--static ui-dialog-row">
          <Link href={`/office/messages/${row.id}`} className="ui-dialog-row__link">
            <UserAvatar name={row.peer.name} avatarKey={row.peer.avatarKey} size={40} />
            <span className="ui-dialog-row__body">
              <span className="ui-dialog-row__name">{ row.peer.name }</span>
              <span className="ui-dialog-row__text">
                { row.lastMessage ? `${row.lastMessage.mine ? 'Вы: ' : ''}${row.lastMessage.content}` : '—' }
              </span>
            </span>
          </Link>
          <div className="ui-row__aside">
            <span className="ui-dialog-row__time"><LocalDate value={row.lastMessageAt} relative /></span>
            { row.unread > 0 && <span className="ui-desk__count" aria-label={`Непрочитанных: ${row.unread}`}>{ row.unread }</span> }
            <MessagePeerControls peerId={row.peer.id} ignored={false} hideOnly onIgnored={ignored => ignored && setRows(prev => prev.filter(r => r.id !== row.id))} />
          </div>
        </div>
      )) }
    </div>
    { load.result.serverError && <Text size="sm" c="red">{ load.result.serverError.message }</Text> }
    { hasMore && <div className="ui-feed-more">
      <Button variant="default" loading={load.isPending} onClick={() => load.execute({ beforeAt: last.lastMessageAt.getTime(), beforeId: last.id })}>
        Показать ещё
      </Button>
    </div> }
  </>
}

