'use client'

import 'client-only';
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import OfficeHead from "@/components/layout/OfficeHead";
import { StrictResource } from "@/core/resource";
import NotificationNotice from "@/domains/notifications/components/NotificationNotice";
import { loadNotificationsAction, readAllNotificationsAction, readNotificationAction } from "@/domains/notifications/actions/notificationActions";
import { notificationItemResource, type NotificationItemResource, type NotificationPageResource } from "@/domains/notifications/dto/notificationResources";
import useHydrated from "@/hooks/useHydrated";
import useLiveEvent from "@/hooks/useLiveEvent";
import { dayDiff } from "@/shared/localDays";
import { Button, Text } from "@mantine/core";
import { IconBell, IconChecks } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type NotificationListProps<T extends NotificationPageResource> = {
  page: StrictResource<T, NotificationPageResource>
}

/*
  История уведомлений (спеки 29, 42): все, новые сверху, группы «Сегодня / Вчера / Раньше» по
  часам браузера — до гидрации одна группа без подписи. Прочитанным делает клик по строке, как
  в колокольчике; новые и прочитанные в других вкладках — по SSE, оттуда же число непрочитанных
*/
export default function NotificationList<T extends NotificationPageResource>({ page }: NotificationListProps<T>) {
  const [ items, setItems ] = useState<NotificationItemResource[]>(page.items);
  const [ hasMore, setHasMore ] = useState(page.hasMore);
  const [ unread, setUnread ] = useState(page.unread);
  const hydrated = useHydrated();
  const load = useAction(loadNotificationsAction, {
    onSuccess: ({ data }) => {
      setItems(prev => [ ...prev, ...data.items.filter(item => !prev.some(i => i.id === item.id)) ]);
      setHasMore(data.hasMore);
      setUnread(data.unread);
    }
  });
  const readOne = useAction(readNotificationAction, { onSuccess: ({ data }) => setUnread(data.unread) });
  const readAll = useAction(readAllNotificationsAction, { onSuccess: ({ data }) => setUnread(data.unread) });

  useLiveEvent('notification.created', data => {
    const item = notificationItemResource.parse(data.notification);
    setItems(prev => prev.some(i => i.id === item.id) ? prev : [ item, ...prev ]);
    setUnread(data.unread);
  });

  useLiveEvent('notification.read', data => {
    markRead(data.id);
    setUnread(data.unread);
  });

  function markRead(id: number | null){
    setItems(prev => prev.map(item => id === null || item.id === id ? { ...item, read: true } : item));
  }

  function open(item: NotificationItemResource){
    if(!item.read){
      markRead(item.id);
      readOne.execute({ id: item.id });
    }
  }

  function readEverything(){
    markRead(null);
    setUnread(0);
    readAll.execute();
  }

  return (
    <>
      <OfficeHead
        title="Уведомления"
        sub={items.length > 0 && (unread > 0 ? `${unread} ${newWord(unread)}` : 'Всё прочитано')}
        action={unread > 0 && <Button variant="default" leftSection={<IconChecks size={16} />} loading={readAll.isPending} onClick={readEverything}>
          Прочитать все
        </Button>}
      />

      { items.length === 0
        ? <EmptyState icon={IconBell} title="Уведомлений пока нет" action={<ButtonLink href="/posts" variant="default">В ленту</ButtonLink>}>
          Сюда придут ответы на ваши комментарии, комментарии к вашим постам, решения модерации и новые сообщения.
        </EmptyState>
        : groupByDay(items, hydrated).map(group => <section key={group.label ?? 'all'} className="ui-notices">
          { group.label && <h2 className="ui-notices__label">{ group.label }</h2> }
          <ul className="ui-notices__list">
            { group.items.map(item => <li key={item.id}>
              <NotificationNotice item={item} onOpen={() => open(item)} />
            </li>) }
          </ul>
        </section>) }

      { load.result.serverError && <Text size="sm" c="red" mt="xs">{ load.result.serverError.message }</Text> }
      { hasMore && <Button variant="default" mt="md" loading={load.isPending} onClick={() => load.execute({ beforeId: items[items.length - 1].id })}>
        Показать ещё
      </Button> }
    </>
  );
}

function groupByDay(items: NotificationItemResource[], hydrated: boolean): Group[] {
  if(!hydrated){
    return [ { label: null, items } ];
  }

  const groups: Group[] = [ { label: 'Сегодня', items: [] }, { label: 'Вчера', items: [] }, { label: 'Раньше', items: [] } ];

  for(const item of items){
    groups[Math.min(Math.max(dayDiff(item.createdAt), 0), 2)].items.push(item);
  }

  return groups.filter(group => group.items.length > 0);
}

// 1 новое, 2 новых, 5 новых
function newWord(n: number): string {
  return n % 10 === 1 && n % 100 !== 11 ? 'новое' : 'новых';
}

type Group = { label: string | null, items: NotificationItemResource[] }
