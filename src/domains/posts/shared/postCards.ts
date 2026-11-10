import 'server-only';
import { db } from "@/globals/db";
import { comments } from "@/database/schema";
import { withRatings } from "@/domains/posts/shared/postRatings";
import { withCovers } from "@/domains/posts/shared/postImages";
import { postSummary, readingMinutes } from "@/domains/posts/shared/postText";
import { visibleComments } from "@/domains/posts/shared/postComments";
import { routeKmByPost } from "@/domains/posts/shared/postRoutePoints";
import type { PostType } from "@/database/schema";
import { and, count, inArray } from "drizzle-orm";

type CardSource = { id: number, type: PostType, lead: string | null, content: string, coverImageId: number | null };

/*
  Всё, что карточке нужно сверх строки поста: оценка, обложка, lead или выдержка, время чтения и
  число комментариев, длина маршрута — по запросу на список, а не на пост
*/
export async function withCardData<T extends CardSource>(posts: T[]){
  const [ counts, kms ] = await Promise.all([
    commentCounts(posts.map(p => p.id)),
    routeKmByPost(posts.filter(p => p.type === 'travel').map(p => p.id))
  ]);
  const rows = await withCovers(await withRatings(posts));

  return rows.map(post => ({
    ...post,
    excerpt: postSummary(post),
    readingMinutes: readingMinutes(post.content),
    commentsCount: counts.get(post.id) ?? 0,
    routeKm: kms.get(post.id) ?? null
  }));
}

/*
  Видимые комментарии, включая комментарии к фото, — как в порядке «Обсуждаемых» (спека 34)
*/
async function commentCounts(postIds: number[]){
  if(postIds.length === 0){
    return new Map<number, number>();
  }

  const rows = await db.select({ postId: comments.postId, n: count() })
    .from(comments)
    .where(and(inArray(comments.postId, postIds), visibleComments()))
    .groupBy(comments.postId);

  return new Map(rows.map(row => [ row.postId, row.n ]));
}
