'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { loadNotificationsAction, readAllNotificationsAction, readNotificationAction, unreadNotificationsAction } from "@/domains/notifications/actions/notificationActions";
import { notificationItemResource, type NotificationItemResource } from "@/domains/notifications/dto/notificationResources";
import useLiveEvent from "@/hooks/useLiveEvent";
import useUser from "@/hooks/useUser";
import { ActionIcon, Button, Indicator, Loader, Popover, PopoverDropdown, PopoverTarget, Text } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NotificationBellProps = {
  // В кабинете счётчик приходит из layout, в публичной части — запросом после гидрации
  initialUnread?: number
}

/*
  Колокольчик в шапке: число непрочитанных живое (SSE), панель при открытии перечитывает
  список. Прочитанным делает клик по строке
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
      setItems(prev => prev?.map(item => ({ ...item, read: true })) ?? null);
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
    setItems(prev => prev?.map(item => data.id === null || item.id === data.id ? { ...item, read: true } : item) ?? null);
  });

  if(!ready || !user){
    return null;
  }

  function toggle(){
    if(!opened){
      setItems(null);
      load.execute({});
    }

    setOpened(!opened);
  }

  function open(item: NotificationItemResource){
    if(!item.read){
      setItems(prev => prev?.map(i => i.id === item.id ? { ...i, read: true } : i) ?? null);
      readOne.execute({ id: item.id });
    }

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
          <div className="ui-notifications__head">Уведомления</div>
          { items === null && <div className="ui-notifications__state"><Loader size="sm" /></div> }
          { items?.length === 0 && <div className="ui-notifications__state">Уведомлений пока нет</div> }
          { items && items.length > 0 && <ul className="ui-notifications__list">
            { items.map(item => <li key={item.id}>
              <NotificationRow item={item} onOpen={() => open(item)} />
            </li>) }
          </ul> }
          { load.result.serverError && <Text size="sm" c="red" px="md" py="xs">{ load.result.serverError.message }</Text> }
          { (hasMore || !!unread) && items !== null && <div className="ui-notifications__foot">
            { hasMore && <Button variant="subtle" size="xs" loading={load.isPending} onClick={() => load.execute({ beforeId: items[items.length - 1].id })}>
              Показать ещё
            </Button> }
            { !!unread && <Button variant="subtle" size="xs" color="gray" loading={readAll.isPending} onClick={() => readAll.execute()}>
              Прочитать все
            </Button> }
          </div> }
        </div>
      </PopoverDropdown>
    </Popover>
  );
}

function NotificationRow({ item, onOpen }: { item: NotificationItemResource, onOpen: () => void }) {
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
