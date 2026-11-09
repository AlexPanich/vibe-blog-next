'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import Link from "@/components/general/Link";
import { StrictResource } from "@/core/resource";
import { readAllNotificationsAction, readNotificationAction } from "@/domains/notifications/actions/notificationActions";
import type { NotificationItemResource } from "@/domains/notifications/dto/notificationResources";
import { notificationLook } from "@/domains/notifications/shared/notificationLook";
import { IconArrowRight } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import type { Route } from "next";
import { useRouter } from "next/navigation";

/*
  Последние уведомления на «Начале» (спека 42): цветная иконка по типу, текст, время, точка
  непрочитанного. Снимок на момент загрузки страницы — живые обновления только у колокольчика
*/
export default function NotificationDigest<T extends NotificationItemResource[]>({ items, unread }: { items: StrictResource<T, NotificationItemResource[]>, unread: number }) {
  const router = useRouter();
  const readAll = useAction(readAllNotificationsAction, { onSuccess: () => router.refresh() });
  const readOne = useAction(readNotificationAction);

  return (
    <section className="ui-digest ui-digest--filled">
      <div className="ui-digest__head">
        <h2 className="ui-digest__title">Уведомления</h2>
        { unread > 0 && <button type="button" className="ui-digest__action" disabled={readAll.isPending} onClick={() => readAll.execute()}>
          Прочитать все
        </button> }
      </div>

      { items.length === 0 && <p className="ui-digest__empty">Пока тихо — здесь появятся ответы, оценки модераторов и новые подписчики.</p> }

      { items.map(item => {
        const { icon: ItemIcon, tone } = notificationLook(item.type);
        const body = <>
          <span className="ui-digest__icon" data-tone={tone}><ItemIcon size={15} stroke={2} /></span>
          <span className="ui-digest__body">
            <span className="ui-digest__text" data-read={item.read}>
              { item.actor && <><b>{ item.actor.name }</b>{ item.inline ? ' ' : ': ' }</> }{ item.text }
            </span>
            <span className="ui-digest__meta"><LocalDate value={item.createdAt} relative /></span>
          </span>
          { !item.read && <span className="ui-digest__dot" aria-label="Не прочитано" /> }
        </>;

        return item.href
          ? <Link key={item.id} className="ui-digest__row" href={item.href as Route} onClick={() => !item.read && readOne.execute({ id: item.id })}>{ body }</Link>
          : <div key={item.id} className="ui-digest__row">{ body }</div>;
      }) }

      <Link href="/office/notifications" className="ui-digest__more">Все уведомления<IconArrowRight size={14} stroke={2} /></Link>
    </section>
  );
}
