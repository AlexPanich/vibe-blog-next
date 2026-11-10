import 'server-only';
import { db } from "@/globals/db";
import { postFavorites, postTags, posts, tags } from "@/database/schema";
import type { FavoriteSort } from "@/domains/posts/dto/postFavoriteRequests";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withCardData } from "@/domains/posts/shared/postCards";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

/*
  Избранное пользователя карточками, новые закладки сверху или по дате публикации (спека 44).
  Только опубликованные: ушедший из ленты пост остаётся в закладках, но не показывается.
  limit — для вкладки на странице автора (спека 40), tagId — вкладка рубрики в кабинете
*/
export async function loadFavorites(userId: number, { limit, tagId, sort = 'added' }: { limit?: number, tagId?: number, sort?: FavoriteSort } = {}){
  const query = db.select({ postId: postFavorites.postId, addedAt: postFavorites.createdAt })
    .from(postFavorites)
    .innerJoin(posts, publishedPost)
    .where(and(
      eq(postFavorites.userId, userId),
      tagId === undefined ? undefined : sql`EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = ${postFavorites.postId} AND pt.tag_id = ${tagId})`
    ))
    .orderBy(...(sort === 'published'
      ? [ desc(posts.publishedAt), desc(posts.id) ]
      // createdAt — с точностью до секунды; при равенстве порядок вставки
      : [ desc(postFavorites.createdAt), desc(sql`${postFavorites}.rowid`) ]));
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

/*
  Рубрики опубликованных постов в избранном с числом постов — вкладки (спека 44, реш. 10):
  частые первыми, при равенстве по алфавиту (в JS: ORDER BY в SQLite кириллицу не сортирует)
*/
export function countFavoriteTags(userId: number){
  const rows = db.select({ id: tags.id, slug: tags.slug, name: tags.name, n: count() })
    .from(postFavorites)
    .innerJoin(posts, publishedPost)
    .innerJoin(postTags, eq(postTags.postId, postFavorites.postId))
    .innerJoin(tags, eq(tags.id, postTags.tagId))
    .where(eq(postFavorites.userId, userId))
    .groupBy(tags.id)
    .all();

  return rows.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'ru'));
}

const publishedPost = and(eq(posts.id, postFavorites.postId), eq(posts.status, 'published'));
