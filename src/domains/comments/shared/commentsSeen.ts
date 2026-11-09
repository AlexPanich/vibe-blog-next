import 'server-only';
import { db } from "@/globals/db";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";

/*
  Отметка «открыл „К моим постам“» (спека 43): ставит сейчас и возвращает прежнюю — по ней
  размечаются «Новый». null — вкладку ещё не открывали, новые все
*/
export function takeCommentsSeen(userId: number){
  return db.transaction(tx => {
    const row = tx.select({ seenAt: users.commentsSeenAt }).from(users).where(eq(users.id, userId)).get();
    tx.update(users).set({ commentsSeenAt: new Date() }).where(eq(users.id, userId)).run();

    return row?.seenAt ?? null;
  });
}

// Прежняя отметка без обновления — для «N новых» на «Начале»
export function commentsSeenAt(userId: number){
  return db.select({ seenAt: users.commentsSeenAt }).from(users).where(eq(users.id, userId)).get()?.seenAt ?? null;
}
