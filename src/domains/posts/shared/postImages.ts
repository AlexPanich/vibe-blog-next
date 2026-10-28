import 'server-only';
import { db } from "@/globals/db";
import { comments, postImages } from "@/database/schema";
import type { PostImage } from "@/database/types";
import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";

/*
  Галерея поста по порядку загрузки, у каждой картинки — число неудалённых комментариев
*/
export async function getPostImages(postId: number){
  return db.select({
    id: postImages.id,
    fileKey: postImages.fileKey,
    width: postImages.width,
    height: postImages.height,
    caption: postImages.caption,
    commentsCount: count(comments.id)
  })
    .from(postImages)
    .leftJoin(comments, and(eq(comments.imageId, postImages.id), isNull(comments.deletedAt)))
    .where(eq(postImages.postId, postId))
    .groupBy(postImages.id)
    .orderBy(asc(postImages.createdAt), asc(postImages.id));
}

/*
  Обложки для карточек одним запросом: выбранная, иначе первая картинка
*/
export async function withCovers<T extends { id: number, coverImageId: number | null }>(posts: T[]){
  const ids = posts.map(p => p.id);
  const images = ids.length === 0 ? [] : await db.select()
    .from(postImages)
    .where(inArray(postImages.postId, ids))
    .orderBy(asc(postImages.createdAt), asc(postImages.id));

  return posts.map(post => ({ ...post, cover: coverOf(post, images.filter(i => i.postId === post.id)) }));
}

export function coverOf(post: { coverImageId: number | null }, images: Pick<PostImage, 'id' | 'fileKey' | 'width' | 'height'>[]){
  const image = images.find(i => i.id === post.coverImageId) ?? images[0];

  return image ? { fileKey: image.fileKey, width: image.width, height: image.height } : null;
}
