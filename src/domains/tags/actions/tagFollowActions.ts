'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { tagFollows, tags } from "@/database/schema";
import { aiIdSchema } from "@/domains/tags/dto/tagRequests";
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import z from "zod";

const TAG_FOLLOWS_LIMIT = 30;

/*
  Подписка на рубрику: её посты в «Моей ленте». Отписаться можно всегда, подписаться — не
  больше чем на 30 рубрик
*/
export const followTagAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(z.object({ follow: z.boolean() }))
  .action(async ({ parsedInput: { follow }, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const own = and(eq(tagFollows.userId, auth.id), eq(tagFollows.tagId, id));

    db.transaction(tx => {
      if(!follow){
        tx.delete(tagFollows).where(own).run();
        return;
      }

      if(!tx.select({ id: tags.id }).from(tags).where(eq(tags.id, id)).get()){
        actionError(404, 'Рубрика не найдена');
      }

      const [ { n } ] = tx.select({ n: count() }).from(tagFollows).where(eq(tagFollows.userId, auth.id)).all();

      if(n >= TAG_FOLLOWS_LIMIT && !tx.select().from(tagFollows).where(own).get()){
        actionError(409, `Не больше ${TAG_FOLLOWS_LIMIT} подписок на рубрики`);
      }

      tx.insert(tagFollows).values({ userId: auth.id, tagId: id }).onConflictDoNothing().run();
    });

    revalidatePath('/office/follows');
    revalidatePath('/office/feed');

    return { following: follow };
  });

export const myTagFollowAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const row = await db.query.tagFollows.findFirst({ where: and(eq(tagFollows.userId, auth.id), eq(tagFollows.tagId, id)) });

    return { following: !!row };
  });

// Все мои подписки на рубрики — одним запросом для страницы /tags
export const myTagFollowIdsAction = actionAuthClient
  .action(async ({ ctx: { auth } }) => {
    const rows = await db.select({ tagId: tagFollows.tagId }).from(tagFollows).where(eq(tagFollows.userId, auth.id));

    return { ids: rows.map(row => row.tagId) };
  });
