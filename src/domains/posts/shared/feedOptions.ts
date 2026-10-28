import 'server-only';
import { db } from "@/globals/db";
import { postTags, posts, tags, users } from "@/database/schema";
import { sortTags } from "@/domains/tags/exports/tagNames";
import { and, count, eq } from "drizzle-orm";

// Авторы с опубликованными постами — для фильтра, по алфавиту
export async function feedAuthors(){
  const rows = await db.selectDistinct({ id: users.id, name: users.name })
    .from(users)
    .innerJoin(posts, and(eq(posts.userId, users.id), eq(posts.status, 'published')));

  return rows.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

// Рубрики со счётчиком опубликованных постов
export async function tagsWithCounts(){
  return sortTags(await db.select({
    id: tags.id,
    name: tags.name,
    slug: tags.slug,
    postsCount: count(posts.id)
  })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .leftJoin(posts, and(eq(posts.id, postTags.postId), eq(posts.status, 'published')))
    .groupBy(tags.id));
}
