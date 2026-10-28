import 'server-only';
import { db } from "@/globals/db";
import { postTags } from "@/database/schema";
import { pickTags } from "@/domains/posts/shared/postTags";
import { eq } from "drizzle-orm";

/*
  Рубрики одного поста — для страниц, где пост загружен без связей (getPost)
*/
export async function getPostTags(postId: number){
  const rows = await db.query.postTags.findMany({ where: eq(postTags.postId, postId), with: { tag: true } });

  return pickTags({ postTags: rows });
}
