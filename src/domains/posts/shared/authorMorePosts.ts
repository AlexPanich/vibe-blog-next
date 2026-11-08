import 'server-only';
import { db } from "@/globals/db";
import { posts } from "@/database/schema";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withCardData } from "@/domains/posts/shared/postCards";
import { and, desc, eq, ne } from "drizzle-orm";

const MORE_LIMIT = 3;

/*
  «Ещё у автора» под постом (спека 30): последние опубликованные посты автора, кроме
  открытого, — карточками
*/
export async function authorMorePosts(authorId: number, exceptPostId: number){
  const rows = await db.query.posts.findMany({
    where: and(eq(posts.userId, authorId), eq(posts.status, 'published'), ne(posts.id, exceptPostId)),
    orderBy: desc(posts.publishedAt),
    limit: MORE_LIMIT,
    with: { author: true, ...POST_TAGS_WITH }
  });

  return withCardData(rows.map(post => ({ ...post, tags: pickTags(post) })));
}
