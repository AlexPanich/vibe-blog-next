'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { rateLimiters } from "@/globals/rateLimiter";
import { removeUploads } from "@/globals/uploads";
import { uploadsConfig } from "@/config/uploads";
import { commentReactions, commentReports, comments, postImages, posts } from "@/database/schema";
import { IMAGE_WIDTHS } from "@/core/imageUrl";
import { aiIdSchema } from "@/domains/posts/dto/postRequests";
import { postImageCaptionDto, postImageUploadDto } from "@/domains/posts/dto/postImageRequests";
import { workWithPost } from "@/domains/posts/policy";
import { removeGalleryRefs } from "@/domains/posts/shared/postGalleryRefs";
import { readImage, saveImageVariants } from "@/shared/images";
import { deleteCommentNotifications } from "@/domains/notifications/exports/notify";
import { eraseEditedTexts } from "@/domains/comments/exports/eraseEditedTexts";
import { consumeOrFail } from "@/shared/rateLimitAction";
import { and, count, eq, inArray } from "drizzle-orm";
import { returnValidationErrors } from "next-safe-action";
import { revalidatePath } from "next/cache";

/*
  Галерея — часть содержимого: breakIfCant проверяет владельца, а «только черновик» — та же
  транзакция, что запись; она же двигает updatedAt поста. Устаревшая страница получает 409, а не 403
*/

export const uploadPostImageAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(postImageUploadDto)
  .action(async ({ parsedInput: { file }, bindArgsParsedInputs: [ postId ], ctx: { auth } }) => {
    const post = await CONTAINER.postService.findOrFail(postId);
    await CONTAINER.boucerService.breakIfCant(u => workWithPost(u, post));
    await consumeOrFail(rateLimiters.imageUpload, String(auth.id));

    const read = await readImage(file);

    if(!read.ok){
      returnValidationErrors(postImageUploadDto, { file: { _errors: [ read.error ] } });
    }

    // Сначала файлы, потом запись: не удалась запись — файлы стираются
    const saved = await saveImageVariants(read.buffer, IMAGE_WIDTHS);

    try{
      const image = db.transaction(tx => {
        touchDraft(tx, postId);

        const [ { total } ] = tx.select({ total: count() }).from(postImages).where(eq(postImages.postId, postId)).all();

        if(total >= uploadsConfig.postImagesPerPost){
          actionError(409, `В посте уже ${uploadsConfig.postImagesPerPost} картинок`);
        }

        return tx.insert(postImages)
          .values({ postId, fileKey: saved.key, width: saved.width, height: saved.height })
          .returning({ id: postImages.id })
          .get();
      });

      revalidateGallery();

      return { id: image.id };
    }
    catch(e){
      await removeUploads(saved.key, IMAGE_WIDTHS);
      throw e;
    }
  });

export const updatePostImageCaptionAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(postImageCaptionDto)
  .action(async ({ parsedInput: { caption }, bindArgsParsedInputs: [ imageId ] }) => {
    const image = await findImageWithAccess(imageId);

    db.transaction(tx => {
      touchDraft(tx, image.postId);
      tx.update(postImages).set({ caption: caption || null }).where(eq(postImages.id, imageId)).run();
    });

    revalidateGallery();

    return { done: true };
  });

export const setPostCoverAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ imageId ] }) => {
    const image = await findImageWithAccess(imageId);

    db.transaction(tx => {
      touchDraft(tx, image.postId);
      tx.update(posts).set({ coverImageId: imageId }).where(eq(posts.id, image.postId)).run();
    });

    revalidateGallery();

    return { done: true };
  });

/*
  Вместе с картинкой уходят её комментарии, их реакции, жалобы и уведомления; журнал модерации
  остаётся, но прежние тексты правок модератора из него стираются (спека 24); блоки фото
  вычищаются из текста (спека 38). foreign_keys выключен — всё явно в транзакции, файлы — после неё
*/
export const deletePostImageAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ imageId ] }) => {
    const image = await findImageWithAccess(imageId);

    db.transaction(tx => {
      touchDraft(tx, image.postId);

      const commentIds = tx.select({ id: comments.id }).from(comments).where(eq(comments.imageId, imageId)).all().map(c => c.id);

      if(commentIds.length > 0){
        tx.delete(commentReactions).where(inArray(commentReactions.commentId, commentIds)).run();
        tx.delete(commentReports).where(inArray(commentReports.commentId, commentIds)).run();
        deleteCommentNotifications(tx, commentIds);
        eraseEditedTexts(tx, commentIds);
        tx.delete(comments).where(inArray(comments.id, commentIds)).run();
      }

      tx.delete(postImages).where(eq(postImages.id, imageId)).run();
      tx.update(posts).set({ coverImageId: null }).where(and(eq(posts.id, image.postId), eq(posts.coverImageId, imageId))).run();

      const { content } = tx.select({ content: posts.content }).from(posts).where(eq(posts.id, image.postId)).get()!;
      const cleaned = removeGalleryRefs(content, id => id !== imageId);

      if(cleaned !== content){
        tx.update(posts).set({ content: cleaned }).where(eq(posts.id, image.postId)).run();
      }
    });

    await removeUploads(image.fileKey, IMAGE_WIDTHS);
    revalidateGallery();

    return { done: true };
  });

type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Проверка «только черновик» и отметка сохранения содержимого (updatedAt, спека 49) — один условный UPDATE
function touchDraft(tx: DBTransaction, postId: number){
  const touched = tx.update(posts)
    .set({ updatedAt: new Date() })
    .where(and(eq(posts.id, postId), eq(posts.status, 'draft')))
    .returning({ id: posts.id })
    .all();

  if(touched.length === 0){
    actionError(409, 'Пост уже не черновик — галерея закрыта');
  }
}

async function findImageWithAccess(imageId: number){
  const image = await db.select().from(postImages).where(eq(postImages.id, imageId)).get();

  if(!image){
    return actionError(409, 'Картинка уже удалена — обновите страницу');
  }

  const post = await CONTAINER.postService.findOrFail(image.postId);
  await CONTAINER.boucerService.breakIfCant(u => workWithPost(u, post));

  return image;
}

function revalidateGallery(){
  revalidatePath('/office/posts/[id]/edit', 'page');
}
