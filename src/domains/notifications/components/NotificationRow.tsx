'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import Link from "@/components/general/Link";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import type { NotificationItemResource } from "@/domains/notifications/dto/notificationResources";
import { IconBell } from "@tabler/icons-react";
import type { Route } from "next";

// Строка уведомления: колокольчик и история. Ссылка — если уведомлению есть куда вести
export default function NotificationRow({ item, onOpen }: { item: NotificationItemResource, onOpen: () => void }) {
  const body = <>
    { item.actor ? <UserAvatar name={item.actor.name} avatarKey={item.actor.avatarKey} size={32} /> : <span className="ui-notification__icon"><IconBell size={16} /></span> }
    <span className="ui-notification__body">
      { item.actor && <span className="ui-notification__actor">{ item.actor.name }</span> }
      <span className="ui-notification__text">{ item.text }</span>
      <span className="ui-notification__meta">
        <LocalDate value={item.createdAt} relative />
        { item.unavailable && ' · пост недоступен' }
      </span>
    </span>
  </>;
  const className = `ui-notification${item.read ? '' : ' ui-notification--unread'}`;

  if(item.href){
    return <Link className={className} href={item.href as Route} onClick={onOpen}>{ body }</Link>;
  }

  return <button type="button" className={className} onClick={onOpen}>{ body }</button>;
}
