import 'server-only';
import { db } from "@/globals/db";
import { postFavorites, posts } from "@/database/schema";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withCardData } from "@/domains/posts/shared/postCards";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

/*
  Избранное пользователя карточками, новые закладки сверху.
  Только опубликованные: ушедший из ленты пост остаётся в закладках, но не показывается
*/
export async function loadFavorites(userId: number){
  const marks = await db.select({ postId: postFavorites.postId, addedAt: postFavorites.createdAt })
    .from(postFavorites)
    .innerJoin(posts, and(eq(posts.id, postFavorites.postId), eq(posts.status, 'published')))
    .where(eq(postFavorites.userId, userId))
    // createdAt — с точностью до секунды; при равенстве порядок вставки
    .orderBy(desc(postFavorites.createdAt), desc(sql`${postFavorites}.rowid`));

  const rows = marks.length === 0 ? [] : await db.query.posts.findMany({
    where: inArray(posts.id, marks.map(m => m.postId)),
    with: { author: true, ...POST_TAGS_WITH }
  });

  const byId = new Map((await withCardData(rows)).map(row => [ row.id, { ...row, tags: pickTags(row) } ]));

  return marks.map(mark => ({ addedAt: mark.addedAt, post: byId.get(mark.postId)! }));
}
