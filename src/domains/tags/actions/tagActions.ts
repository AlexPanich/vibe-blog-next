'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { postTags, tagAliases, tagFollows, tags } from "@/database/schema";
import { aiIdSchema, tagDto } from "@/domains/tags/dto/tagRequests";
import { tagMergeDto } from "@/domains/tags/dto/tagModerationRequests";
import { manageTags } from "@/domains/tags/policy";
import { tagNameKey } from "@/domains/tags/shared/tagNames";
import { slugify } from "@/core/slug";
import { and, eq, like, ne, sql } from "drizzle-orm";
import { returnValidationErrors } from "next-safe-action";
import { revalidatePath } from "next/cache";

export const createTagAction = actionAuthClient
  .inputSchema(tagDto)
  .action(async ({ parsedInput }) => {
    await CONTAINER.boucerService.breakIfCant(manageTags);

    const nameKey = tagNameKey(parsedInput.name);
    const base = slugify(parsedInput.name);

    if(!base){
      nameError('Нужны буквы или цифры');
    }

    await ensureNameFree(nameKey);

    // Слаг не меняется при переименовании, поэтому при совпадении — первый свободный суффикс.
    // Заняты и slug рубрик, и алиасы слитых рубрик (спека 47): старый адрес ведёт на целевую
    const taken = new Set([
      ...(await db.select({ slug: tags.slug }).from(tags).where(like(tags.slug, `${base}%`))),
      ...(await db.select({ slug: tagAliases.slug }).from(tagAliases).where(like(tagAliases.slug, `${base}%`))),
    ].map(t => t.slug));
    let slug = base;

    for(let i = 2; taken.has(slug); i++){
      slug = `${base}-${i}`;
    }

    await db.insert(tags).values({ name: parsedInput.name, nameKey, slug });
    revalidatePath('/office/moderation/tags');

    return { done: true };
  });

export const renameTagAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(tagDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ] }) => {
    await CONTAINER.boucerService.breakIfCant(manageTags);

    const nameKey = tagNameKey(parsedInput.name);
    await ensureNameFree(nameKey, id);

    await db.update(tags).set({ name: parsedInput.name, nameKey }).where(eq(tags.id, id));
    revalidatePath('/office/moderation/tags');

    return { done: true };
  });

/*
  Рубрика снимается с постов, посты остаются, подписки на неё и алиасы (спека 47) удаляются.
  Связи чистим сами: PRAGMA foreign_keys не включён, и cascade из схемы не сработает
*/
export const deleteTagAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ] }) => {
    await CONTAINER.boucerService.breakIfCant(manageTags);

    db.transaction(tx => {
      tx.delete(postTags).where(eq(postTags.tagId, id)).run();
      tx.delete(tagFollows).where(eq(tagFollows.tagId, id)).run();
      tx.delete(tagAliases).where(eq(tagAliases.tagId, id)).run();
      tx.delete(tags).where(eq(tags.id, id)).run();
    });

    revalidatePath('/office/moderation/tags');
    revalidatePath('/office/follows');

    return { done: true };
  });

/*
  Слияние рубрик (спека 47): посты и подписки исходной переходят к целевой (дубли отбрасывает
  PK — ON CONFLICT DO NOTHING), slug исходной и её алиасы становятся алиасами целевой,
  исходная удаляется. Транзакция better-sqlite3 синхронная: обе рубрики читаются внутри неё,
  и если одну уже удалили или слили — ошибка до первой записи
*/
export const mergeTagAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(tagMergeDto)
  .action(async ({ parsedInput: { targetId }, bindArgsParsedInputs: [ id ] }) => {
    await CONTAINER.boucerService.breakIfCant(manageTags);

    if(id === targetId){
      returnValidationErrors(tagMergeDto, { targetId: { _errors: [ 'Выберите другую рубрику' ] } });
    }

    const names = db.transaction(tx => {
      const source = tx.select().from(tags).where(eq(tags.id, id)).get();
      const target = tx.select().from(tags).where(eq(tags.id, targetId)).get();

      if(!source || !target){
        actionError(409, 'Рубрика уже удалена — обновите страницу');
      }

      tx.insert(postTags)
        .select(tx.select({ postId: postTags.postId, tagId: sql<number>`${target.id}`.as('tag_id') }).from(postTags).where(eq(postTags.tagId, source.id)))
        .onConflictDoNothing()
        .run();
      tx.delete(postTags).where(eq(postTags.tagId, source.id)).run();

      tx.insert(tagFollows)
        .select(tx.select({ userId: tagFollows.userId, tagId: sql<number>`${target.id}`.as('tag_id'), createdAt: tagFollows.createdAt }).from(tagFollows).where(eq(tagFollows.tagId, source.id)))
        .onConflictDoNothing()
        .run();
      tx.delete(tagFollows).where(eq(tagFollows.tagId, source.id)).run();

      tx.update(tagAliases).set({ tagId: target.id }).where(eq(tagAliases.tagId, source.id)).run();
      tx.insert(tagAliases).values({ slug: source.slug, tagId: target.id }).run();
      tx.delete(tags).where(eq(tags.id, source.id)).run();

      return { source: source.name, target: target.name };
    });

    revalidatePath('/office/moderation/tags');
    revalidatePath('/office/follows');

    return { done: true, ...names };
  });

async function ensureNameFree(nameKey: string, exceptId?: number){
  const existing = await db.query.tags.findFirst({
    where: exceptId ? and(eq(tags.nameKey, nameKey), ne(tags.id, exceptId)) : eq(tags.nameKey, nameKey)
  });

  if(existing){
    nameError('Такая рубрика уже есть');
  }
}

function nameError(message: string): never {
  return returnValidationErrors(tagDto, { name: { _errors: [ message ] } });
}
