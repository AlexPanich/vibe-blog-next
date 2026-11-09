import { users } from "@/database/schema";
import type { User } from "@/database/types";
import { and, gt, isNotNull, isNull, or, type SQL } from "drizzle-orm";

/*
  Бан действует (спека 46): bannedAt есть, а срок не задан (навсегда) или ещё не наступил.
  Истёкший бан не снимается задачей — поля остаются до входа, их чистит хук в globals/auth.ts.
  Поэтому голую проверку bannedAt не писать: только эти два хелпера
*/
export function isBanActive(u: Pick<User, 'bannedAt' | 'bannedUntil'>, now = new Date()): boolean {
  return u.bannedAt !== null && (u.bannedUntil === null || u.bannedUntil > now);
}

/*
  То же условие для WHERE и CASE. now — значение JS, а не unixepoch(): drizzle сам
  переводит Date в секунды колонки
*/
export function banActiveSql(now = new Date()): SQL {
  return and(isNotNull(users.bannedAt), or(isNull(users.bannedUntil), gt(users.bannedUntil, now)))!;
}
