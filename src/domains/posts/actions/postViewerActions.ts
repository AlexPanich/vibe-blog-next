'use server'

import 'server-only';
import { actionAuthClient } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { postFavorites } from "@/database/schema";
import { aiIdSchema } from "@/domains/posts/dto/postRequests";
import type { PostReportState } from "@/domains/posts/dto/postResources";
import { reportStateOf } from "@/domains/posts/shared/postReports";
import { and, eq } from "drizzle-orm";

/*
  «Своё» на странице поста одним запросом: избранное и жалоба (спека 36, п. 8). Публичная
  страница сессию на сервере не читает, клиент спрашивает сам после гидрации
*/
export const loadPostViewerAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }): Promise<{ favorite: boolean, report: PostReportState }> => {
    const favorite = db.select({ postId: postFavorites.postId })
      .from(postFavorites)
      .where(and(eq(postFavorites.userId, auth.id), eq(postFavorites.postId, id)))
      .get();

    return { favorite: !!favorite, report: reportStateOf(db, id, auth.id) };
  });
