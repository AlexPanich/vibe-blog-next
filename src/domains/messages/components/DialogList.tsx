'use client'

import 'client-only';
import ClientValue from "@/components/general/ClientValue";
import { StrictResource } from "@/core/resource";
import { loadDialogsAction } from "@/domains/messages/actions/messageActions";
import type { DialogRowResource } from "@/domains/messages/dto/messageResources";
import { shortWhen } from "@/domains/messages/shared/messageDates";
import { messageSnippet } from "@/domains/messages/shared/messageSnippet";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import useLiveEvent from "@/hooks/useLiveEvent";
import { Button, Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type DialogListProps<T extends DialogRowResource[]> = {
  meId: number,
  dialogs: StrictResource<T, DialogRowResource[]>,
  hasMore: boolean,
  // Поиск по имени собеседника — с сервера, с задержкой
  q: string
}

const SEARCH_DELAY = 300;

/*
  Список переписок в левой колонке «Сообщений», свежие сверху; открытый диалог подсвечен.
  Новое сообщение в показанном диалоге поднимает строку на месте; всё остальное (новый
  диалог, удаление, прочитано) перечитывает первую порцию. Layout перечитан на сервере
  (скрыли переписку, отправили сообщение) — без поиска берём его список
*/
export default function DialogList<T extends DialogRowResource[]>({ meId, dialogs: initial, hasMore: initialHasMore, q }: DialogListProps<T>) {
  const [ rows, setRows ] = useState<DialogRowResource[]>(initial);
  const [ hasMore, setHasMore ] = useState(initialHasMore);
  const [ source, setSource ] = useState<DialogRowResource[]>(initial);
  const activeId = Number(useParams<{ id?: string }>().id);
  const query = useRef(q);
  const load = useAction(loadDialogsAction, {
    onSuccess: ({ data, input }) => {
      // Ответ на устаревший запрос поиска
      if((input.q ?? '') !== query.current){
        return;
      }

      setRows(prev => input.beforeId === undefined ? data.items : [ ...prev, ...data.items.filter(d => !prev.some(p => p.id === d.id)) ]);
      setHasMore(data.hasMore);
    }
  });
  // execute меняется на каждом рендере — эффект берёт его из ref
  const reload = useRef(load.execute);

  if(source !== initial){
    setSource(initial);

    if(q === ''){
      setRows(initial);
      setHasMore(initialHasMore);
    }
  }

  useEffect(() => {
    reload.current = load.execute;
  });

  useEffect(() => {
    if(query.current === q){
      return;
    }

    query.current = q;
    const timer = setTimeout(() => reload.current(firstPage()), SEARCH_DELAY);

    return () => clearTimeout(timer);
  }, [ q ]);

  useLiveEvent('message.created', ({ dialogId, message }) => {
    const row = rows.find(r => r.id === dialogId);

    if(!row){
      load.execute(firstPage());
      return;
    }

    const mine = message.userId === meId;
    const updated = {
      ...row,
      lastMessage: { content: messageSnippet(message.content), mine },
      lastMessageAt: new Date(message.createdAt),
      unread: mine || dialogId === activeId ? row.unread : row.unread + 1
    };

    setRows(prev => [ updated, ...prev.filter(r => r.id !== dialogId) ]);
  });

  useLiveEvent('message.deleted', () => load.execute(firstPage()));
  useLiveEvent('message.read', () => load.execute(firstPage()));
  useLiveEvent('open', () => load.execute(firstPage()));

  function firstPage(){
    return query.current === '' ? {} : { q: query.current };
  }

  if(rows.length === 0){
    return q === ''
      ? <p className="ui-chat-list__empty">
          Переписок пока нет. Написать можно со страницы автора — кнопка «Написать» рядом с подпиской. <Link href="/authors">К авторам</Link>
        </p>
      : <p className="ui-chat-list__empty">Никого не нашлось</p>;
  }

  const last = rows[rows.length - 1];

  return (
    <div className="ui-chat-list">
      { rows.map(row => (
        <Link key={row.id} href={`/office/messages/${row.id}`} className="ui-chat-row" data-active={row.id === activeId} data-unread={row.unread > 0}>
          <UserAvatar name={row.peer.name} avatarKey={row.peer.avatarKey} size={44} />
          <span className="ui-chat-row__body">
            <span className="ui-chat-row__top">
              <span className="ui-chat-row__name">{ row.peer.name }</span>
              <time className="ui-chat-row__time" dateTime={row.lastMessageAt.toISOString()}>
                <ClientValue server="" client={() => shortWhen(row.lastMessageAt)} />
              </time>
            </span>
            <span className="ui-chat-row__bottom">
              <span className="ui-chat-row__text">
                { row.lastMessage ? `${row.lastMessage.mine ? 'Вы: ' : ''}${row.lastMessage.content}` : '—' }
              </span>
              { row.unread > 0 && <span className="ui-chat-row__count" aria-label={`Непрочитанных: ${row.unread}`}>{ row.unread }</span> }
            </span>
          </span>
        </Link>
      )) }
      { load.result.serverError && <Text size="sm" c="red" px="md">{ load.result.serverError.message }</Text> }
      { hasMore && <div className="ui-chat-list__more">
        <Button variant="subtle" size="xs" loading={load.isPending} onClick={() => load.execute({ ...firstPage(), beforeAt: last.lastMessageAt.getTime(), beforeId: last.id })}>
          Показать ещё
        </Button>
      </div> }
    </div>
  );
}
