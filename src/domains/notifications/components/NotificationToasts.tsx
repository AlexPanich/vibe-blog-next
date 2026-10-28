'use client'

import 'client-only';
import { showToast } from "@/components/general/showToast";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { readNotificationAction } from "@/domains/notifications/actions/notificationActions";
import { notificationItemResource } from "@/domains/notifications/dto/notificationResources";
import useLiveEvent from "@/hooks/useLiveEvent";
import { IconBell } from "@tabler/icons-react";

/*
  Тост нового уведомления (спека 29). Только в видимой вкладке: в фоновой он устарел бы к
  возвращению, а колокольчик и так обновится. У личного сообщения свой тост — MessageToasts.
  Переход по тосту читает уведомление, как клик в колокольчике; крестик — нет
*/
export default function NotificationToasts() {
  useLiveEvent('notification.created', data => {
    const item = notificationItemResource.parse(data.notification);

    if(document.visibilityState !== 'visible' || item.type === 'message.created'){
      return;
    }

    showToast({
      id: `notification-${item.id}`,
      icon: item.actor ? <UserAvatar name={item.actor.name} avatarKey={item.actor.avatarKey} size={32} /> : <span className="ui-notification__icon"><IconBell size={16} /></span>,
      title: item.actor?.name ?? 'Уведомление',
      text: item.text,
      href: item.href,
      onOpen: () => readNotificationAction({ id: item.id })
    });
  });

  return null;
}
