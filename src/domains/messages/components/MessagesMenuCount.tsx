'use client'

import 'client-only';
import { unreadMessagesAction } from "@/domains/messages/actions/messageActions";
import useLiveEvent from "@/hooks/useLiveEvent";
import { useAction } from "next-safe-action/hooks";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/*
  Бейдж пункта «Сообщения»: начальное число — с сервера, дальше перечитывается по событиям
  сообщений, после переподключения и при переходах (открытый диалог отмечает прочитанным)
*/
export default function MessagesMenuCount({ initial }: { initial: number }) {
  const [ unread, setUnread ] = useState(initial);
  const count = useAction(unreadMessagesAction, { onSuccess: ({ data }) => setUnread(data.unread) });
  const pathname = usePathname();
  // execute меняется на каждом рендере — эффект берёт его из ref
  const refresh = useRef(count.execute);
  const firstPath = useRef(pathname);

  useEffect(() => {
    refresh.current = count.execute;
  });

  useEffect(() => {
    if(firstPath.current !== pathname){
      refresh.current();
    }
  }, [ pathname ]);

  useLiveEvent('message.created', () => count.execute());
  useLiveEvent('message.deleted', () => count.execute());
  useLiveEvent('message.read', () => count.execute());
  useLiveEvent('open', () => count.execute());

  return unread > 0 ? <span className="ui-desk__count" aria-label={`Непрочитанных: ${unread}`}>{ unread }</span> : null;
}
