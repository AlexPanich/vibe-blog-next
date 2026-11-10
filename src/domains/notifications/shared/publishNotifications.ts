import 'server-only';
import { liveBus } from "@/globals/liveBus";
import { countUnread, countUnreadByTab, loadNotificationItems } from "@/domains/notifications/shared/loadNotifications";

/*
  После commit транзакции, в которой их создал notify: откаченное действие не должно
  успеть прилететь в браузер. Ошибки шины действие не роняют — liveBus снимает подписчика
*/
export function publishNotifications(ids: number[]){
  const counts = new Map<number, { unread: number, unreadTabs: ReturnType<typeof countUnreadByTab> }>();

  for(const { userId, item } of loadNotificationItems(ids)){
    if(!counts.has(userId)){
      counts.set(userId, { unread: countUnread(userId), unreadTabs: countUnreadByTab(userId) });
    }

    liveBus.publish(userId, 'notification.created', { notification: item, ...counts.get(userId)! });
  }
}

// Прочитаны действием другого домена (открыт диалог): вкладки отмечают строки и счётчик
export function publishNotificationsRead(userId: number, ids: number[]){
  if(ids.length === 0){
    return;
  }

  const unread = countUnread(userId);
  const unreadTabs = countUnreadByTab(userId);
  ids.forEach(id => liveBus.publish(userId, 'notification.read', { id, tab: null, unread, unreadTabs }));
}
