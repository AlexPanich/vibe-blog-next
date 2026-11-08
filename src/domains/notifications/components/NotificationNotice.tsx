'use client'

import 'client-only';
import ClientValue from "@/components/general/ClientValue";
import Link from "@/components/general/Link";
import type { NotificationItemResource } from "@/domains/notifications/dto/notificationResources";
import { notificationLook } from "@/domains/notifications/shared/notificationLook";
import { formatWhen } from "@/shared/localDays";
import { IconArrowRight } from "@tabler/icons-react";
import type { Route } from "next";

/*
  Строка истории уведомлений (спека 42): цветная иконка по типу, заголовок, текст, время,
  точка непрочитанного, подпись действия. Вся строка — ссылка, если уведомлению есть куда вести
*/
export default function NotificationNotice({ item, onOpen }: { item: NotificationItemResource, onOpen: () => void }) {
  const { icon: ItemIcon, tone, title, action } = notificationLook(item.type);
  const body = <>
    <span className="ui-notice__icon" data-tone={tone}><ItemIcon size={18} stroke={2} /></span>
    <span className="ui-notice__body">
      <span className="ui-notice__title">{ title }</span>
      <span className="ui-notice__text">{ item.actor && <b>{ item.actor.name }: </b> }{ item.text }</span>
    </span>
    <span className="ui-notice__side">
      <span className="ui-notice__when">
        <time dateTime={item.createdAt.toISOString()}><ClientValue server="" client={() => formatWhen(item.createdAt)} /></time>
        { !item.read && <span className="ui-notice__dot" aria-label="Не прочитано" /> }
      </span>
      { item.href && <span className="ui-notice__action">{ action }<IconArrowRight size={13} stroke={2} /></span> }
      { item.unavailable && <span className="ui-notice__gone">пост недоступен</span> }
    </span>
  </>;

  if(item.href){
    return <Link className="ui-notice" data-unread={!item.read} href={item.href as Route} onClick={onOpen}>{ body }</Link>;
  }

  return <button type="button" className="ui-notice" data-unread={!item.read} onClick={onOpen}>{ body }</button>;
}
