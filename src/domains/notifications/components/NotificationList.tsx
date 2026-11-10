'use client'

import 'client-only';
import ButtonLink from "@/components/general/ButtonLink";
import Link from "@/components/general/Link";
import EmptyState from "@/components/general/EmptyState";
import OfficeHead from "@/components/layout/OfficeHead";
import { StrictResource } from "@/core/resource";
import NotificationNotice from "@/domains/notifications/components/NotificationNotice";
import { loadNotificationsAction, readAllNotificationsAction, readNotificationAction } from "@/domains/notifications/actions/notificationActions";
import { notificationItemResource, type NotificationItemResource, type NotificationPageResource } from "@/domains/notifications/dto/notificationResources";
import { isReplacedBy } from "@/domains/notifications/shared/notificationGroup";
import { NOTIFICATION_TAB_LABELS, NOTIFICATION_TAB_OF, type NotificationTab } from "@/domains/notifications/shared/notificationTabs";
import { notificationsUrl } from "@/domains/notifications/shared/notificationsUrl";
import useHydrated from "@/hooks/useHydrated";
import useLiveEvent from "@/hooks/useLiveEvent";
import { dayDiff } from "@/shared/localDays";
import { Button, Text } from "@mantine/core";
import { IconBell, IconChecks } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type NotificationListProps<T extends NotificationPageResource> = {
  page: StrictResource<T, NotificationPageResource>,
  // Открытая вкладка (спека 44); без неё — «Все»
  tab?: NotificationTab,
  // Вкладки человека: «Модерация» — только у staff
  tabs: NotificationTab[]
}

/*
  История уведомлений (спеки 29, 42): все, новые сверху, группы «Сегодня / Вчера / Раньше» по
  часам браузера — до гидрации одна группа без подписи. Вкладки по типам с числом непрочитанных
  (спека 44): числа считает сервер и шлёт в событиях. Прочитанным делает клик по строке, как
  в колокольчике; новые и прочитанные в других вкладках — по SSE, оттуда же число непрочитанных
*/
export default function NotificationList<T extends NotificationPageResource>({ page, tab, tabs }: NotificationListProps<T>) {
  const [ items, setItems ] = useState<NotificationItemResource[]>(page.items);
  const [ hasMore, setHasMore ] = useState(page.hasMore);
  const [ unread, setUnread ] = useState(page.unread);
  const [ unreadTabs, setUnreadTabs ] = useState(page.unreadTabs);
  const hydrated = useHydrated();
  const load = useAction(loadNotificationsAction, {
    onSuccess: ({ data }) => {
      setItems(prev => [ ...prev, ...data.items.filter(item => !prev.some(i => i.id === item.id)) ]);
      setHasMore(data.hasMore);
      setCounts(data);
    }
  });
  const readOne = useAction(readNotificationAction, { onSuccess: ({ data }) => setCounts(data) });
  const readAll = useAction(readAllNotificationsAction, { onSuccess: ({ data }) => setCounts(data) });
  const tabUnread = tab ? unreadTabs[tab] : unread;

  useLiveEvent('notification.created', data => {
    const item = notificationItemResource.parse(data.notification);

    // Чужая вкладке строка не добавляется и ничего не заменяет; числа — всегда
    if(!tab || NOTIFICATION_TAB_OF[item.type] === tab){
      // Строка группы заменяет прежнюю (спека 51)
      setItems(prev => prev.some(i => i.id === item.id) ? prev : [ item, ...prev.filter(i => !isReplacedBy(i, item)) ]);
    }

    setCounts(data);
  });

  useLiveEvent('notification.read', data => {
    if(data.id !== null){
      markRead(item => item.id === data.id);
    }
    else if(data.tab === null || data.tab === tab){
      markRead(() => true);
    }
    else if(!tab){
      markRead(item => NOTIFICATION_TAB_OF[item.type] === data.tab);
    }

    setCounts(data);
  });

  function setCounts(data: { unread: number, unreadTabs: Record<NotificationTab, number> }){
    setUnread(data.unread);
    setUnreadTabs(data.unreadTabs);
  }

  function markRead(match: (item: NotificationItemResource) => boolean){
    setItems(prev => prev.map(item => !item.read && match(item) ? { ...item, read: true } : item));
  }

  function open(item: NotificationItemResource){
    if(!item.read){
      markRead(i => i.id === item.id);
      readOne.execute({ id: item.id });
    }
  }

  // Оптимистично: на вкладке список уже только её, на «Все» — всё
  function readEverything(){
    markRead(() => true);
    readAll.execute({ tab });
  }

  return (
    <>
      <OfficeHead
        title="Уведомления"
        sub={(tab || items.length > 0) && (unread > 0 ? `${unread} ${newWord(unread)}` : 'Всё прочитано')}
        action={tabUnread > 0 && <Button variant="default" size="md" leftSection={<IconChecks size={16} />} loading={readAll.isPending} onClick={readEverything}>
          Прочитать все
        </Button>}
      />

      { (tab || items.length > 0) && <nav className="ui-tabs" aria-label="Вид уведомлений">
        <Link href={notificationsUrl({})} data-active={!tab}>
          Все { unread > 0 && <span className="ui-tabs__count">{ unread }</span> }
        </Link>
        { tabs.map(t => <Link key={t} href={notificationsUrl({ tab: t })} data-active={t === tab}>
          { NOTIFICATION_TAB_LABELS[t] } { unreadTabs[t] > 0 && <span className="ui-tabs__count">{ unreadTabs[t] }</span> }
        </Link>) }
      </nav> }

      { items.length === 0 && tab
        ? <div className="ui-empty">
          <IconBell size={26} stroke={1.6} />
          <p>На этой вкладке уведомлений нет. <Link href="/office/notifications">Все уведомления</Link></p>
        </div>
        : items.length === 0
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
      { hasMore && <Button variant="default" mt="md" loading={load.isPending} onClick={() => load.execute({ beforeId: items[items.length - 1].id, tab })}>
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
