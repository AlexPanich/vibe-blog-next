'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { userFollows, users } from "@/database/schema";
import { aiIdSchema } from "@/domains/users/dto/userAdminRequests";
import { followersCount, followState, publishFollowersCount, USER_FOLLOWS_LIMIT } from "@/domains/users/shared/userFollows";
import { isBlockedBetween } from "@/domains/users/shared/userBlocks";
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import z from "zod";

/*
  Подписка одним кликом, без подтверждения. Отписаться можно всегда, подписаться — на
  существующего, не на себя, без блокировки между нами и не больше чем на 200 авторов
*/
export const followUserAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(z.object({ follow: z.boolean() }))
  .action(async ({ parsedInput: { follow }, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const own = and(eq(userFollows.followerId, auth.id), eq(userFollows.followingId, id));

    if(id === auth.id){
      actionError(403, 'Подписаться на себя нельзя');
    }

    db.transaction(tx => {
      if(!follow){
        tx.delete(userFollows).where(own).run();
        return;
      }

      if(!tx.select({ id: users.id }).from(users).where(eq(users.id, id)).get()){
        actionError(404, 'Пользователь не найден');
      }

      if(isBlockedBetween(tx, auth.id, id)){
        actionError(403, 'Подписка недоступна: блокировка');
      }

      const [ { n } ] = tx.select({ n: count() }).from(userFollows).where(eq(userFollows.followerId, auth.id)).all();

      if(n >= USER_FOLLOWS_LIMIT && !tx.select().from(userFollows).where(own).get()){
        actionError(409, `Не больше ${USER_FOLLOWS_LIMIT} подписок на авторов`);
      }

      tx.insert(userFollows).values({ followerId: auth.id, followingId: id }).onConflictDoNothing().run();
    });

    await publishFollowersCount([ id ]);
    revalidatePath('/authors/[id]', 'page');
    revalidatePath('/office/follows');
    revalidatePath('/office/feed');

    return { ...(await followState(auth.id, id)), followersCount: await followersCount(id) };
  });

/*
  Своё состояние: публичная страница сессию на сервере не читает, клиент спрашивает сам
*/
export const myUserFollowAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    return { ...(await followState(auth.id, id)), followersCount: await followersCount(id) };
  });
