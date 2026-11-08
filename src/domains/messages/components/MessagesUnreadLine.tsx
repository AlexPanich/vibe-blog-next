'use client'

import 'client-only';
import useUnreadMessages from "@/domains/messages/hooks/useUnreadMessages";
import { plural } from "@/core/plural";

// Подзаголовок «Сообщений»: «2 непрочитанных», живой — как бейдж меню
export default function MessagesUnreadLine({ initial }: { initial: number }) {
  const unread = useUnreadMessages(initial);

  return unread > 0 ? `${unread} ${plural(unread, [ 'непрочитанное', 'непрочитанных', 'непрочитанных' ])}` : 'Всё прочитано';
}
