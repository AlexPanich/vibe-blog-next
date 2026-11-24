import 'server-only';
import { db } from "@/globals/db";
import { embedEnabled } from "@/globals/ai";
import { aiConfig } from "@/config/ai";
import { postTags, posts } from "@/database/schema";
import { cardsByIds } from "@/domains/posts/shared/postCards";
import { ensureEmbeddings, loadVectors } from "@/domains/posts/shared/postEmbeddings";
import { topBySimilarity } from "@/core/vectors";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";

const SIMILAR_LIMIT = 3;

/*
  «Похожие истории» под постом (спека 56, п. 9–11): опубликованные, кроме самого поста и
  exceptIds («Ещё у автора»). Есть вектор у поста — по сходству не ниже similarMin, иначе —
  по общим рубрикам (больше общих выше, при равенстве новее). У кандидатов без вектора —
  сравниваем с теми, что есть (реш. 19 плана)
*/
export async function similarPosts(post: { id: number }, exceptIds: number[]){
  const excluded = [ post.id, ...exceptIds ];
  let ids: number[] | null = null;

  if(embedEnabled){
    ensureEmbeddings();

    const vectors = loadVectors();
    const own = vectors.find(v => v.id === post.id);

    if(own){
      const candidates = vectors.filter(v => !excluded.includes(v.id));

      ids = topBySimilarity(own.vector, candidates, aiConfig.embed.similarMin, SIMILAR_LIMIT).map(item => item.id);
    }
  }

  return cardsByIds(ids ?? byTags(post.id, excluded));
}

// Посты без общих рубрик тоже подходят (LEFT JOIN): блок есть, пока есть другие посты (п. 11)
function byTags(postId: number, excluded: number[]){
  const own = db.select({ id: postTags.tagId }).from(postTags).where(eq(postTags.postId, postId));
  const shared = sql<number>`count(${postTags.tagId})`;

  return db.select({ id: posts.id })
    .from(posts)
    .leftJoin(postTags, and(eq(postTags.postId, posts.id), inArray(postTags.tagId, own)))
    .where(and(eq(posts.status, 'published'), notInArray(posts.id, excluded)))
    .groupBy(posts.id)
    .orderBy(desc(shared), desc(posts.publishedAt), desc(posts.id))
    .limit(SIMILAR_LIMIT)
    .all()
    .map(row => row.id);
}
