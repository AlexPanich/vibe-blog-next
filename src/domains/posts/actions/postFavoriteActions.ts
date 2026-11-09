'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { postFavorites, posts, users } from "@/database/schema";
import { aiIdSchema, postFavoritesPublicDto } from "@/domains/posts/dto/postRequests";
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
  Показывать избранное на странице автора (спека 40). Колонка — у users, better-auth её не знает
*/
export const updateFavoritesPublicAction = actionAuthClient
  .inputSchema(postFavoritesPublicDto)
  .action(async ({ parsedInput: { favoritesPublic }, ctx: { auth } }) => {
    db.update(users).set({ favoritesPublic }).where(eq(users.id, auth.id)).run();
    revalidatePath('/office/profile');
    revalidatePath('/office/favorites');
    // 'layout' — чтобы задеть и /authors/[id]/favorites
    revalidatePath('/authors/[id]', 'layout');

    return { favoritesPublic };
  });

