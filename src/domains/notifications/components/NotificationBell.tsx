'use client'

import 'client-only';
import NotificationRow from "@/domains/notifications/components/NotificationRow";
import { loadNotificationsAction, readAllNotificationsAction, readNotificationAction, unreadNotificationsAction } from "@/domains/notifications/actions/notificationActions";
import { notificationItemResource, type NotificationItemResource } from "@/domains/notifications/dto/notificationResources";
import useLiveEvent from "@/hooks/useLiveEvent";
import useUser from "@/hooks/useUser";
import { ActionIcon, Button, Indicator, Loader, Popover, PopoverDropdown, PopoverTarget, Text } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useEffect, useRef, useState } from "react";

type NotificationBellProps = {
  // В кабинете счётчик приходит из layout, в публичной части — запросом после гидрации
  initialUnread?: number
}

/*
  Колокольчик в шапке: число непрочитанных живое (SSE), панель при открытии перечитывает
  список. В панели — только непрочитанные (спека 29): клик по строке читает её и убирает,
  прочитанные — в истории office/notifications
*/
export default function NotificationBell({ initialUnread }: NotificationBellProps) {
  const { user, ready } = useUser();
  const [ unread, setUnread ] = useState<number | null>(initialUnread ?? null);
  const [ opened, setOpened ] = useState(false);
  const [ items, setItems ] = useState<NotificationItemResource[] | null>(null);
  const [ hasMore, setHasMore ] = useState(false);

  const count = useAction(unreadNotificationsAction, { onSuccess: ({ data }) => setUnread(data.unread) });
  const load = useAction(loadNotificationsAction, {
    onSuccess: ({ data, input }) => {
      setItems(prev => input.beforeId === undefined ? data.items : [ ...(prev ?? []), ...data.items ]);
      setHasMore(data.hasMore);
      setUnread(data.unread);
    }
  });
  const readOne = useAction(readNotificationAction, { onSuccess: ({ data }) => setUnread(data.unread) });
  const readAll = useAction(readAllNotificationsAction, {
    onSuccess: ({ data }) => {
      setUnread(data.unread);
      setItems(prev => prev && []);
    }
  });

  // execute меняется на каждом рендере — эффекты берут его из ref
  const refreshCount = useRef(count.execute);
  const countedFor = useRef<number | null>(initialUnread === undefined ? null : user?.id ?? null);

  // Гостю — ничего: колокольчик смонтирован и у него, а живой канал гостя (спека 22) тоже шлёт open
  useEffect(() => {
    refreshCount.current = user ? count.execute : () => {};
  });

  useEffect(() => {
    if(ready && user && countedFor.current !== user.id){
      countedFor.current = user.id;
      refreshCount.current();
    }
  }, [ ready, user ]);

  // Событие, пришедшее в разрыв или в спящую вкладку, теряется, а строка в таблице — нет
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refreshCount.current();
    document.addEventListener('visibilitychange', onVisible);

    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useLiveEvent('open', () => refreshCount.current());

  useLiveEvent('notification.created', data => {
    setUnread(data.unread);

    if(opened){
      const item = notificationItemResource.parse(data.notification);
      setItems(prev => prev && !prev.some(i => i.id === item.id) ? [ item, ...prev ] : prev);
    }
  });

  useLiveEvent('notification.read', data => {
    setUnread(data.unread);
    setItems(prev => prev && (data.id === null ? [] : prev.filter(item => item.id !== data.id)));
  });

  if(!ready || !user){
    return null;
  }

  function toggle(){
    if(!opened){
      setItems(null);
      load.execute({ unreadOnly: true });
    }

    setOpened(!opened);
  }

  function open(item: NotificationItemResource){
    setItems(prev => prev && prev.filter(i => i.id !== item.id));
    readOne.execute({ id: item.id });

    if(item.href){
      setOpened(false);
    }
  }

  const label = unread && unread > 0 ? `Уведомления: ${unread} непрочитанных` : 'Уведомления';

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" width={360} shadow="md" withinPortal>
      <PopoverTarget>
        <Indicator label={unread && unread > 99 ? '99+' : unread} disabled={!unread} size={16} offset={4} color="red">
          <ActionIcon variant="subtle" color="gray" size="lg" radius="sm" aria-label={label} title={label} onClick={toggle}>
            <IconBell size={18} />
          </ActionIcon>
        </Indicator>
      </PopoverTarget>
      <PopoverDropdown p={0}>
        <div className="ui-notifications">
          <div className="ui-notifications__head">
            Уведомления
            { !!items?.length && <Button variant="subtle" size="compact-xs" color="gray" loading={readAll.isPending} onClick={() => readAll.execute()}>
              Отметить прочитанными
            </Button> }
          </div>
          { items === null && <div className="ui-notifications__state"><Loader size="sm" /></div> }
          { items?.length === 0 && <div className="ui-notifications__state">Новых уведомлений нет</div> }
          { items && items.length > 0 && <ul className="ui-notifications__list">
            { items.map(item => <li key={item.id}>
              <NotificationRow item={item} onOpen={() => open(item)} />
            </li>) }
          </ul> }
          { load.result.serverError && <Text size="sm" c="red" px="md" py="xs">{ load.result.serverError.message }</Text> }
          { items !== null && <div className="ui-notifications__foot">
            { hasMore && items.length > 0
              ? <Button variant="subtle" size="xs" loading={load.isPending} onClick={() => load.execute({ beforeId: items[items.length - 1].id, unreadOnly: true })}>
                Показать ещё
              </Button>
              : <span /> }
            <Button component={Link} href="/office/notifications" variant="subtle" size="xs" color="gray" onClick={() => setOpened(false)}>
              Все уведомления
            </Button>
          </div> }
        </div>
      </PopoverDropdown>
    </Popover>
  );
}

