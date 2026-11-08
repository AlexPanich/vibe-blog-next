'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { validate } from "@/shared/validation";
import { db } from "@/globals/db";
import { postTags, posts, tags } from "@/database/schema";
import { aiIdSchema, postEditorDto, PostOwnCreateDto } from "@/domains/posts/dto/postRequests";
import { createPost, transitPost, workWithPost } from "@/domains/posts/policy";
import { changePostStatus } from "@/domains/posts/shared/changePostStatus";
import { postDetailsColumns } from "@/domains/posts/shared/postDetails";
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
    const post = db.transaction(tx => {
      const created = tx.insert(posts).values({ ...fields, ...postDetailsColumns(details), userId: auth.id }).returning().get();
      replacePostTags(tx, created.id, tagIds);
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
	.inputSchema(postEditorDto)
	.action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const post = await CONTAINER.postService.findOrFail(id);
    await CONTAINER.boucerService.breakIfCant(u => workWithPost(u, post));

    if(parsedInput.submit){
      await CONTAINER.boucerService.breakIfCant(u => transitPost(u, post, 'submit'));
    }

    await validate(postEditorDto, parsedInput, {
      url: unique(posts.url).exclude(posts.id, post.id)
    })
    await ensureTagsExist(parsedInput.tagIds);

    // Редактировать можно только черновик — текст, рубрики и тип; статус проверяется в том же запросе
    const { tagIds, details, submit, ...fields } = parsedInput;
    db.transaction(tx => {
      const updated = tx.update(posts)
        .set({ ...fields, ...postDetailsColumns(details) })
        .where(and(eq(posts.id, post.id), eq(posts.status, 'draft')))
        .returning({ id: posts.id })
        .all();

      if(updated.length === 0){
        actionError(409, 'Пост уже не черновик — редактирование закрыто');
      }

      replacePostTags(tx, post.id, tagIds);
    });

    if(submit){
      changePostStatus(post.id, 'submit', auth.id);

      return redirect(`/office/posts/${post.id}`);
    }

    // Черновик остаётся в редакторе: форма видит время сохранения, галерея — свежие данные
    revalidatePath(`/office/posts/${post.id}/edit`);

    return { savedAt: new Date() };
	});

type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
