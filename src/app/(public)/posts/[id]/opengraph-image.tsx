import { ImageResponse } from "next/og";
import { db } from "@/globals/db";
import { users } from "@/database/schema";
import { getPublishedPost } from "@/domains/posts/shared/getPublishedPost";
import { getPostTags } from "@/domains/posts/shared/getPostTags";
import PostOgImage from "@/domains/posts/components/PostOgImage";
import { coverOf, getPostImages } from "@/domains/posts/shared/postImages";
import { uploadPath } from "@/globals/uploads";
import sharp from "sharp";
import { idOrFail } from "@/shared/params";
import { stripMarkdown } from "@/core/markdown";
import { eq } from "drizzle-orm";

export const size = { width: 1200, height: 630 };

export const contentType = 'image/png';

export const alt = 'Превью поста';

export default async function PostOpengraphImage({ params }: { params: Promise<{ id: string }> }) {
  // Не опубликован — 404, как и сама страница: превью не раскрывает черновики
  const post = await getPublishedPost(idOrFail((await params).id));
  const [ author, tags, images ] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, post.userId), columns: { name: true } }),
    getPostTags(post.id),
    getPostImages(post.id)
  ]);
  const cover = await coverDataUrl(coverOf(post, images)?.fileKey);

  return new ImageResponse(
    <PostOgImage cover={cover} type={post.type} title={post.title} summary={post.lead ?? stripMarkdown(post.content)} author={author?.name ?? ''} tags={tags.map(t => t.name)} />,
    size
  );
}

/*
  Satori не умеет webp — обложка 800 перекодируется в png и встраивается data URL.
  Файла нет (стёрли руками) — превью без обложки, а не 500
*/
async function coverDataUrl(key: string | undefined){
  if(!key){
    return null;
  }

  try{
    const png = await sharp(uploadPath(`${key}-800.webp`)).resize(480, 630, { fit: 'cover' }).png().toBuffer();

    return `data:image/png;base64,${png.toString('base64')}`;
  }
  catch{
    return null;
  }
}
