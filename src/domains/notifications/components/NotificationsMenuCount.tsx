'use client'

import 'client-only';
import useLiveEvent from "@/hooks/useLiveEvent";
import { useState } from "react";

// Бейдж пункта «Уведомления»: начальное число — с сервера, дальше — из событий, они несут счётчик
export default function NotificationsMenuCount({ initial }: { initial: number }) {
  const [ unread, setUnread ] = useState(initial);

  useLiveEvent('notification.created', data => setUnread(data.unread));
  useLiveEvent('notification.read', data => setUnread(data.unread));

  return unread > 0 ? <span className="ui-desk__count" aria-label={`Непрочитанных: ${unread}`}>{ unread }</span> : null;
}
