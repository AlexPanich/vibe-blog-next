import 'server-only';
import { actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { users } from "@/database/schema";
import { parseRoles } from "@/domains/users/shared/userRoles";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

/*
  Транзакция better-sqlite3 синхронная: между чтением и записью никто не вклинится.
  Поэтому здесь перепроверяется, что действующий всё ещё admin (два админа не разжалуют
  друг друга одновременно), а состояние цели читается и сверяется с ожидаемым
*/
export function adminTransaction<T>(actorId: number, targetId: number, change: (tx: DBTransaction, target: AdminTarget) => T): T {
  return db.transaction(tx => {
    const actor = tx.select({ roles: users.roles, bannedAt: users.bannedAt }).from(users).where(eq(users.id, actorId)).get();

    if(!actor || actor.bannedAt || !parseRoles(actor.roles).includes('admin')){
      actionError(403, 'У вас больше нет прав администратора');
    }

    const target = tx.select({ roles: users.roles, bannedAt: users.bannedAt, avatarKey: users.avatarKey }).from(users).where(eq(users.id, targetId)).get();

    if(!target){
      return notFound();
    }

    return change(tx, target);
  });
}

export function staleError(): never {
  return actionError(409, 'Пользователь уже изменился — обновите страницу');
}

export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type AdminTarget = Pick<typeof users.$inferSelect, 'roles' | 'bannedAt' | 'avatarKey'>;
