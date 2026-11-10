'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { validate } from "@/shared/validation";
import { db } from "@/globals/db";
import { postImages, postTags, posts, tags } from "@/database/schema";
import { aiIdSchema, postEditorDto, postUpdateDto, PostOwnCreateDto } from "@/domains/posts/dto/postRequests";
import { createPost, transitPost, workWithPost } from "@/domains/posts/policy";
import { changePostStatus } from "@/domains/posts/shared/changePostStatus";
import { postDetailsColumns } from "@/domains/posts/shared/postDetails";
import { removeGalleryRefs } from "@/domains/posts/shared/postGalleryRefs";
import { replaceRoutePoints, type DBTransaction } from "@/domains/posts/shared/postRoutePoints";
import { and, eq, inArray } from "drizzle-orm";
import { returnValidationErrors } from "next-safe-action";
import { unique } from "drizzle-validator";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/*
  Новый пост (спека 42): черновик открывается в редакторе — там уже можно добавить фото;
  с submit пост сразу уходит на проверку и открывается его карточка
*/
export const createPostAction = actionAuthClient
	.inputSchema(postEditorDto)
	.action(async ({ parsedInput, ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(createPost);

    await validate(postEditorDto, parsedInput, {
      url: unique(posts.url)
    })
    await ensureTagsExist(parsedInput.tagIds);

    const { tagIds, details, submit, ...fields } = parsedInput;
    // галереи у нового поста ещё нет — ссылкам на фото не на что указывать (спека 38)
    fields.content = removeGalleryRefs(fields.content, () => false);

    const post = db.transaction(tx => {
      const created = tx.insert(posts).values({ ...fields, ...postDetailsColumns(details), userId: auth.id }).returning().get();
      replacePostTags(tx, created.id, tagIds);
      replaceRoutePoints(tx, created.id, details.type === 'travel' ? details.points : []);
      return created;
    });

    if(submit){
      changePostStatus(post.id, 'submit', auth.id);

      return redirect(`/office/posts/${post.id}`);
    }

    return redirect(`/office/posts/${post.id}/edit`);
	});

export const updatePostAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
	.inputSchema(postUpdateDto)
	.action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const post = await CONTAINER.postService.findOrFail(id);
    await CONTAINER.boucerService.breakIfCant(u => workWithPost(u, post));

    if(parsedInput.submit){
      await CONTAINER.boucerService.breakIfCant(u => transitPost(u, post, 'submit'));
    }

    await validate(postUpdateDto, parsedInput, {
      url: unique(posts.url).exclude(posts.id, post.id)
    })
    await ensureTagsExist(parsedInput.tagIds);

    /*
      Редактировать можно только черновик — текст, рубрики и тип. Статус и версия (updatedAt, с
      которым открыт редактор) проверяются в том же запросе; не совпало — причина по свежей строке
    */
    const { tagIds, details, submit, version, ...fields } = parsedInput;
    /*
      Фото, которых уже нет в галерее (удалили, пока была открыта форма), молча выбрасываются
      (спека 38). Фото удаляют только в черновике и двигают updatedAt — гонку ловит версия
    */
    const imageIds = new Set((await db.select({ id: postImages.id }).from(postImages).where(eq(postImages.postId, post.id))).map(i => i.id));
    fields.content = removeGalleryRefs(fields.content, imageId => imageIds.has(imageId));

    db.transaction(tx => {
      const updated = tx.update(posts)
        .set({ ...fields, ...postDetailsColumns(details), updatedAt: new Date() })
        .where(and(eq(posts.id, post.id), eq(posts.status, 'draft'), eq(posts.updatedAt, version)))
        .returning({ id: posts.id })
        .all();

      if(updated.length === 0){
        const fresh = tx.select({ status: posts.status }).from(posts).where(eq(posts.id, post.id)).get();

        if(fresh?.status !== 'draft'){
          actionError(409, 'Пост уже не черновик — редактирование закрыто');
        }

        actionError(409, 'Пост сохранили в другой вкладке — скопируйте правки и обновите страницу');
      }

      replacePostTags(tx, post.id, tagIds);
      // Уход с travel стирает маршрут той же транзакцией (спека 37)
      replaceRoutePoints(tx, post.id, details.type === 'travel' ? details.points : []);
    });

    if(submit){
      changePostStatus(post.id, 'submit', auth.id);

      return redirect(`/office/posts/${post.id}`);
    }

    // Черновик остаётся в редакторе: перерисовка приносит форме updatedAt, галерее — свежие данные
    revalidatePath(`/office/posts/${post.id}/edit`);

    return { saved: true };
	});

async function ensureTagsExist(tagIds: PostOwnCreateDto['tagIds']){
  if(tagIds.length === 0){
    return;
  }

  const found = await db.select({ id: tags.id }).from(tags).where(inArray(tags.id, tagIds));

  if(found.length !== tagIds.length){
    returnValidationErrors(postEditorDto, { tagIds: { _errors: [ 'Рубрика удалена — обновите страницу' ] } });
  }
}

function replacePostTags(tx: DBTransaction, postId: number, tagIds: number[]){
  tx.delete(postTags).where(eq(postTags.postId, postId)).run();

  if(tagIds.length > 0){
    tx.insert(postTags).values(tagIds.map(tagId => ({ postId, tagId }))).run();
  }
}
