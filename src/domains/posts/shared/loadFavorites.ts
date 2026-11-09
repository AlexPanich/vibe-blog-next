import 'server-only';
import { db } from "@/globals/db";
import { postFavorites, posts } from "@/database/schema";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withCardData } from "@/domains/posts/shared/postCards";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

/*
  Избранное пользователя карточками, новые закладки сверху.
  Только опубликованные: ушедший из ленты пост остаётся в закладках, но не показывается.
  limit — для вкладки на странице автора (спека 40)
*/
export async function loadFavorites(userId: number, limit?: number){
  const query = db.select({ postId: postFavorites.postId, addedAt: postFavorites.createdAt })
    .from(postFavorites)
    .innerJoin(posts, publishedPost)
    .where(eq(postFavorites.userId, userId))
    // createdAt — с точностью до секунды; при равенстве порядок вставки
    .orderBy(desc(postFavorites.createdAt), desc(sql`${postFavorites}.rowid`));
  const marks = await (limit === undefined ? query : query.limit(limit));

  const rows = marks.length === 0 ? [] : await db.query.posts.findMany({
    where: inArray(posts.id, marks.map(m => m.postId)),
    with: { author: true, ...POST_TAGS_WITH }
  });

  const byId = new Map((await withCardData(rows)).map(row => [ row.id, { ...row, tags: pickTags(row) } ]));

  return marks.map(mark => ({ addedAt: mark.addedAt, post: byId.get(mark.postId)! }));
}

// Число опубликованных постов в избранном — для вкладки «Избранное · N»
export async function countFavorites(userId: number){
  const [ row ] = await db.select({ count: count() })
    .from(postFavorites)
    .innerJoin(posts, publishedPost)
    .where(eq(postFavorites.userId, userId));

  return row.count;
}

const publishedPost = and(eq(posts.id, postFavorites.postId), eq(posts.status, 'published'));
