import 'server-only';
import { db } from "@/globals/db";
import { postTags, posts, tags } from "@/database/schema";
import { and, count, eq, inArray } from "drizzle-orm";

type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AuthorTopic = { id: number, name: string, slug: string };

/*
  Самые частые рубрики опубликованных постов каждого автора, не больше limit; при равенстве —
  по алфавиту. Справочник авторов (спека 30) и подпись собеседника в сообщениях (спека 49).
  Синхронная: вызывается и внутри транзакции
*/
export function authorTopics(conn: typeof db | DBTransaction, userIds: number[], limit: number){
  const rows = userIds.length === 0 ? [] : conn.select({ userId: posts.userId, id: tags.id, name: tags.name, slug: tags.slug, n: count() })
    .from(postTags)
    .innerJoin(posts, and(eq(posts.id, postTags.postId), eq(posts.status, 'published')))
    .innerJoin(tags, eq(tags.id, postTags.tagId))
    .where(inArray(posts.userId, userIds))
    .groupBy(posts.userId, tags.id)
    .all();
  const byUser = new Map<number, AuthorTopic[]>();
  const sorted = rows.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'ru'));

  for(const { userId, id, name, slug } of sorted){
    const list = byUser.get(userId) ?? [];

    if(list.length < limit){
      byUser.set(userId, [ ...list, { id, name, slug } ]);
    }
  }

  return byUser;
}
