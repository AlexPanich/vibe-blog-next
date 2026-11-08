'use client'

import 'client-only';
import useUnreadMessages from "@/domains/messages/hooks/useUnreadMessages";

// Бейдж пункта «Сообщения» в меню кабинета
export default function MessagesMenuCount({ initial }: { initial: number }) {
  const unread = useUnreadMessages(initial);

  return unread > 0 ? <span className="ui-desk__count" aria-label={`Непрочитанных: ${unread}`}>{ unread }</span> : null;
}
