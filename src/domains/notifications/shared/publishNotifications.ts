import 'server-only';
import { liveBus } from "@/globals/liveBus";
import { countUnread, loadNotificationItems } from "@/domains/notifications/shared/loadNotifications";

/*
  После commit транзакции, в которой их создал notify: откаченное действие не должно
  успеть прилететь в браузер. Ошибки шины действие не роняют — liveBus снимает подписчика
*/
export function publishNotifications(ids: number[]){
  const unread = new Map<number, number>();

  for(const { userId, item } of loadNotificationItems(ids)){
    if(!unread.has(userId)){
      unread.set(userId, countUnread(userId));
    }

    liveBus.publish(userId, 'notification.created', { notification: item, unread: unread.get(userId)! });
  }
}

// Прочитаны действием другого домена (открыт диалог): вкладки отмечают строки и счётчик
export function publishNotificationsRead(userId: number, ids: number[]){
  if(ids.length === 0){
    return;
  }

  const unread = countUnread(userId);
  ids.forEach(id => liveBus.publish(userId, 'notification.read', { id, unread }));
}
