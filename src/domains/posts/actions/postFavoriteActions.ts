'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { postFavorites, posts } from "@/database/schema";
import { aiIdSchema } from "@/domains/posts/dto/postRequests";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import z from "zod";

export const togglePostFavoriteAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(z.object({ favorite: z.boolean() }))
  .action(async ({ parsedInput: { favorite }, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const own = and(eq(postFavorites.userId, auth.id), eq(postFavorites.postId, id));

    db.transaction(tx => {
      if(!favorite){
        // Убрать можно всегда — даже если пост уже ушёл из ленты
        tx.delete(postFavorites).where(own).run();
        return;
      }

      const post = tx.select({ status: posts.status }).from(posts).where(eq(posts.id, id)).get();

      if(post?.status !== 'published'){
        actionError(409, 'Пост больше не опубликован');
      }

      tx.insert(postFavorites).values({ userId: auth.id, postId: id }).onConflictDoNothing().run();
    });

    revalidatePath('/office/favorites');

    return { favorite };
  });

/*
  Своё состояние: публичная страница сессию на сервере не читает, клиент спрашивает сам
*/
export const myPostFavoriteAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const row = await db.query.postFavorites.findFirst({
      where: and(eq(postFavorites.userId, auth.id), eq(postFavorites.postId, id))
    });

    return { favorite: !!row };
  });
