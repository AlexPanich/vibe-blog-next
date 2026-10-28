import 'server-only';
import { db } from "@/globals/db";
import { userBlocks } from "@/database/schema";
import { and, eq, inArray, or } from "drizzle-orm";

export const USER_BLOCKS_LIMIT = 500;

// И транзакция, и сам db: helpers зовут и из транзакций записи, и из чтения
type Executor = Pick<typeof db, 'select'>

/*
  Блокировка в любую сторону — запрет взаимодействия (спека 26). Кто кого — важно только
  для кнопки и для скрытия у блокирующего (blockState)
*/
export function isBlockedBetween(tx: Executor, a: number, b: number){
  return !!tx.select({ userId: userBlocks.userId })
    .from(userBlocks)
    .where(or(
      and(eq(userBlocks.userId, a), eq(userBlocks.blockedId, b)),
      and(eq(userBlocks.userId, b), eq(userBlocks.blockedId, a))
    ))
    .get();
}

// Кто из ids связан с userId блокировкой в любую сторону
export function blockedAmong(tx: Executor, userId: number, ids: number[]): number[] {
  if(ids.length === 0){
    return [];
  }

  const mine = tx.select({ id: userBlocks.blockedId }).from(userBlocks).where(and(eq(userBlocks.userId, userId), inArray(userBlocks.blockedId, ids))).all();
  const theirs = tx.select({ id: userBlocks.userId }).from(userBlocks).where(and(eq(userBlocks.blockedId, userId), inArray(userBlocks.userId, ids))).all();

  return [ ...new Set([ ...mine, ...theirs ].map(r => r.id)) ];
}

// Кого из ids заблокировал сам userId — у него они скрыты
export function blockingAmong(tx: Executor, userId: number, ids: number[]): number[] {
  if(ids.length === 0){
    return [];
  }

  return tx.select({ id: userBlocks.blockedId }).from(userBlocks).where(and(eq(userBlocks.userId, userId), inArray(userBlocks.blockedId, ids))).all().map(r => r.id);
}

// Подзапросы «все, с кем у userId блокировка» — для notInArray в выборках
export function blockedWithQueries(userId: number){
  return [
    db.select({ id: userBlocks.blockedId }).from(userBlocks).where(eq(userBlocks.userId, userId)),
    db.select({ id: userBlocks.userId }).from(userBlocks).where(eq(userBlocks.blockedId, userId))
  ] as const;
}

export function blockState(tx: Executor, me: number, other: number){
  const rows = tx.select({ userId: userBlocks.userId })
    .from(userBlocks)
    .where(or(
      and(eq(userBlocks.userId, me), eq(userBlocks.blockedId, other)),
      and(eq(userBlocks.userId, other), eq(userBlocks.blockedId, me))
    ))
    .all();

  return { blocking: rows.some(r => r.userId === me), blockedBy: rows.some(r => r.userId === other) };
}
