'use client'

import 'client-only';
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import { StrictResource } from "@/core/resource";
import NotificationRow from "@/domains/notifications/components/NotificationRow";
import { loadNotificationsAction, readAllNotificationsAction, readNotificationAction } from "@/domains/notifications/actions/notificationActions";
import { notificationItemResource, type NotificationItemResource, type NotificationPageResource } from "@/domains/notifications/dto/notificationResources";
import useLiveEvent from "@/hooks/useLiveEvent";
import { Button, Text } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type NotificationListProps<T extends NotificationPageResource> = {
  page: StrictResource<T, NotificationPageResource>
}

/*
  История уведомлений (спека 29): все, новые сверху, непрочитанные выделены. Прочитанным
  делает клик по строке, как в колокольчике; новые и прочитанные в других вкладках — по SSE
*/
export default function NotificationList<T extends NotificationPageResource>({ page }: NotificationListProps<T>) {
  const [ items, setItems ] = useState<NotificationItemResource[]>(page.items);
  const [ hasMore, setHasMore ] = useState(page.hasMore);
  const load = useAction(loadNotificationsAction, {
    onSuccess: ({ data }) => {
      setItems(prev => [ ...prev, ...data.items.filter(item => !prev.some(i => i.id === item.id)) ]);
      setHasMore(data.hasMore);
    }
  });
  const readOne = useAction(readNotificationAction);
  const readAll = useAction(readAllNotificationsAction);
  const unread = items.some(item => !item.read);

  useLiveEvent('notification.created', data => {
    const item = notificationItemResource.parse(data.notification);
    setItems(prev => prev.some(i => i.id === item.id) ? prev : [ item, ...prev ]);
  });

  useLiveEvent('notification.read', data => markRead(data.id));

  function markRead(id: number | null){
    setItems(prev => prev.map(item => id === null || item.id === id ? { ...item, read: true } : item));
  }

  function open(item: NotificationItemResource){
    if(!item.read){
      markRead(item.id);
      readOne.execute({ id: item.id });
    }
  }

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Уведомления</h1>
        { unread && <Button variant="default" loading={readAll.isPending} onClick={() => { markRead(null); readAll.execute(); }}>
          Отметить прочитанными
        </Button> }
      </div>
      { items.length === 0
        ? <EmptyState icon={IconBell} title="Уведомлений пока нет" action={<ButtonLink href="/posts" variant="default">В ленту</ButtonLink>}>
          Сюда придут ответы на ваши комментарии, комментарии к вашим постам, решения модерации и новые сообщения.
        </EmptyState>
        : <ul className="ui-notifications__list ui-notifications__list--page">
          { items.map(item => <li key={item.id}>
            <NotificationRow item={item} onOpen={() => open(item)} />
          </li>) }
        </ul> }
      { load.result.serverError && <Text size="sm" c="red" mt="xs">{ load.result.serverError.message }</Text> }
      { hasMore && <Button variant="default" mt="md" loading={load.isPending} onClick={() => load.execute({ beforeId: items[items.length - 1].id })}>
        Показать ещё
      </Button> }
    </>
  );
}
