'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { userBlocks, userFollows, users } from "@/database/schema";
import { aiIdSchema } from "@/domains/users/dto/userAdminRequests";
import { blockUser } from "@/domains/users/policy";
import { parseRoles } from "@/domains/users/shared/userRoles";
import { blockState, USER_BLOCKS_LIMIT } from "@/domains/users/shared/userBlocks";
import { publishFollowersCount } from "@/domains/users/shared/userFollows";
import { deleteSocialNotificationsBetween } from "@/domains/notifications/exports/notify";
import { and, count, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import z from "zod";

/*
  Блокировка (спека 26): подписки снимаются в обе стороны, висящие социальные уведомления
  между ними — удаляются. Разблокировка снимает только свою строку: встречная — чужая
*/
export const blockUserAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(z.object({ block: z.boolean() }))
  .action(async ({ parsedInput: { block }, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const own = and(eq(userBlocks.userId, auth.id), eq(userBlocks.blockedId, id));

    db.transaction(tx => {
      if(!block){
        tx.delete(userBlocks).where(own).run();
        return;
      }

      const target = tx.select({ id: users.id, roles: users.roles }).from(users).where(eq(users.id, id)).get();

      if(!target){
        actionError(404, 'Пользователь не найден');
      }

      if(!blockUser(auth, { id: target.id, staff: isStaff(target.roles) })){
        actionError(403, target.id === auth.id ? 'Себя заблокировать нельзя' : 'Модератора и администратора заблокировать нельзя');
      }

      const [ { n } ] = tx.select({ n: count() }).from(userBlocks).where(eq(userBlocks.userId, auth.id)).all();

      if(n >= USER_BLOCKS_LIMIT && !tx.select().from(userBlocks).where(own).get()){
        actionError(409, `Не больше ${USER_BLOCKS_LIMIT} блокировок`);
      }

      tx.insert(userBlocks).values({ userId: auth.id, blockedId: id }).onConflictDoNothing().run();
      tx.delete(userFollows)
        .where(or(
          and(eq(userFollows.followerId, auth.id), eq(userFollows.followingId, id)),
          and(eq(userFollows.followerId, id), eq(userFollows.followingId, auth.id))
        ))
        .run();
      deleteSocialNotificationsBetween(tx, auth.id, id);
    });

    // Блокировка снимает подписки в обе стороны — счётчики обоих
    if(block){
      await publishFollowersCount([ auth.id, id ]);
    }

    revalidatePath('/authors/[id]', 'page');
    revalidatePath('/office/follows');
    revalidatePath('/office/feed');

    return myBlockState(auth.id, id);
  });

/*
  Своё состояние для страницы автора: публичная страница сессию на сервере не читает
*/
export const myUserBlockAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    return myBlockState(auth.id, id);
  });

function myBlockState(me: number, other: number){
  const target = db.select({ id: users.id, roles: users.roles }).from(users).where(eq(users.id, other)).get();

  if(!target){
    return actionError(404, 'Пользователь не найден');
  }

  return { ...blockState(db, me, other), canBlock: blockUser({ id: me }, { id: other, staff: isStaff(target.roles) }) };
}

function isStaff(roles: string){
  const parsed = parseRoles(roles);

  return parsed.includes('moderator') || parsed.includes('admin');
}
