import 'server-only';
import { db } from "@/globals/db";
import { postTags, posts, tagFollows, tags } from "@/database/schema";
import { sortTags } from "@/domains/tags/shared/tagNames";
import { and, count, eq } from "drizzle-orm";

// Мои рубрики (спека 42): с числом опубликованных постов, по алфавиту
export async function loadFollowedTags(userId: number){
  return sortTags(await db.select({ id: tags.id, name: tags.name, slug: tags.slug, postsCount: count(posts.id) })
    .from(tagFollows)
    .innerJoin(tags, eq(tags.id, tagFollows.tagId))
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .leftJoin(posts, and(eq(posts.id, postTags.postId), eq(posts.status, 'published')))
    .where(eq(tagFollows.userId, userId))
    .groupBy(tags.id));
}
