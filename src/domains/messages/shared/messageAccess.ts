import 'server-only';
import { db } from "@/globals/db";
import { dialogs, messageIgnores, messageRestrictions, userFollows, users } from "@/database/schema";
import type { AuthUser } from "@/shared/authUser";
import { isBlockedBetween } from "@/domains/users/exports/userBlocks";
import { and, eq, or } from "drizzle-orm";

export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const MESSAGE_IGNORES_LIMIT = 200;

export const MESSAGE_PAGE_SIZE = 50;

// Пара в диалоге хранится упорядоченной: low < high
export function dialogPair(a: number, b: number){
  return a < b ? { userLowId: a, userHighId: b } : { userLowId: b, userHighId: a };
}

export function findDialogBetween(tx: DBTransaction, a: number, b: number){
  const { userLowId, userHighId } = dialogPair(a, b);

  return tx.select().from(dialogs).where(and(eq(dialogs.userLowId, userLowId), eq(dialogs.userHighId, userHighId))).get();
}

// Свой диалог и собеседник в нём; чужой — как отсутствующий: staff переписку не видит
export function findOwnDialog(tx: DBTransaction, dialogId: number, userId: number){
  const dialog = tx.select()
    .from(dialogs)
    .where(and(eq(dialogs.id, dialogId), or(eq(dialogs.userLowId, userId), eq(dialogs.userHighId, userId))))
    .get();

  return dialog ? { ...dialog, peerId: dialog.userLowId === userId ? dialog.userHighId : dialog.userLowId } : undefined;
}

/*
  Почему sender не может написать recipient; null — может. Собеседник должен существовать —
  это проверяет вызывающий. Закрытость не хранится, а вычисляется: подписка изменилась —
  личка открылась сама. Staff обходит «только от друзей», но не запрет
*/
export function writeBlockReason(tx: DBTransaction, sender: Pick<AuthUser, 'id' | 'roles'>, recipientId: number): string | null {
  if(sender.id === recipientId){
    return 'Себе написать нельзя';
  }

  const recipient = tx.select({ bannedAt: users.bannedAt, friendsOnly: users.messagesFriendsOnly }).from(users).where(eq(users.id, recipientId)).get();

  if(!recipient){
    return 'Пользователь не найден';
  }

  if(recipient.bannedAt){
    return 'Аккаунт заблокирован';
  }

  if(isBlockedBetween(tx, sender.id, recipientId)){
    return 'Переписка недоступна: блокировка';
  }

  if(isRestricted(tx, recipientId, sender.id)){
    return 'Пользователь ограничил сообщения';
  }

  const staff = sender.roles.includes('moderator') || sender.roles.includes('admin');

  if(recipient.friendsOnly && !staff && !areFriends(tx, sender.id, recipientId)){
    return 'Пользователь принимает сообщения только от друзей';
  }

  return null;
}

// userId запретил restrictedId писать ему
export function isRestricted(tx: DBTransaction, userId: number, restrictedId: number){
  return !!tx.select().from(messageRestrictions).where(and(eq(messageRestrictions.userId, userId), eq(messageRestrictions.restrictedId, restrictedId))).get();
}

export function isIgnored(tx: DBTransaction, userId: number, ignoredId: number){
  return !!tx.select().from(messageIgnores).where(and(eq(messageIgnores.userId, userId), eq(messageIgnores.ignoredId, ignoredId))).get();
}

function areFriends(tx: DBTransaction, a: number, b: number){
  const rows = tx.select({ followerId: userFollows.followerId })
    .from(userFollows)
    .where(or(
      and(eq(userFollows.followerId, a), eq(userFollows.followingId, b)),
      and(eq(userFollows.followerId, b), eq(userFollows.followingId, a))
    ))
    .all();

  return rows.length === 2;
}
