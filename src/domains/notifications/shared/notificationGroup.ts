import type { NotificationType } from "@/database/schema";

/*
  Ключ группы уведомления (спека 51): строки с одним ключом заменяют друг друга. Клиенту — чтобы
  выкинуть заменённую строку из открытого списка, не дожидаясь перезагрузки. Без меток: нужен
  и серверу, и клиенту
*/
export function groupKeyOf(row: { type: NotificationType, postId: number | null, dialogId: number | null }): string | null {
  switch(row.type){
    case 'comment.created':
    case 'comment.reply':
    case 'post.rated':
      return `${row.type}:p${row.postId}`;
    case 'user.followed':
      return `${row.type}:u`;
    case 'message.created':
      return `${row.type}:d${row.dialogId}`;
    default:
      return null;
  }
}

// Группа заменяет только непрочитанную строку; у сообщений строка на диалог одна всегда
export function isReplacedBy(old: GroupedItem, incoming: GroupedItem): boolean {
  return old.id !== incoming.id
    && old.groupKey !== null
    && old.groupKey === incoming.groupKey
    && (!old.read || incoming.type === 'message.created');
}

type GroupedItem = { id: number, type: NotificationType, groupKey: string | null, read: boolean }
