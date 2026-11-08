import 'server-only';
import { db } from "@/globals/db";
import { posts } from "@/database/schema";
import { withCovers } from "@/domains/posts/shared/postImages";
import { and, desc, eq } from "drizzle-orm";

/*
  Обложка последнего опубликованного поста каждого автора — баннер в карточке автора
  (спека 30). Для нескольких авторов: по запросу на каждого. Нет обложки — null
*/
export async function lastPostCovers(userIds: number[]){
  const last = await Promise.all(userIds.map(async userId => {
    const [ post ] = await db.select({ id: posts.id, coverImageId: posts.coverImageId })
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.status, 'published')))
      .orderBy(desc(posts.publishedAt))
      .limit(1);

    return post ? { ...post, userId } : null;
  }));
  const covered = await withCovers(last.filter(post => post !== null));

  return new Map(covered.map(post => [ post.userId, post.cover ]));
}
