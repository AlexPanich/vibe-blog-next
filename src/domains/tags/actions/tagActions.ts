'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { postTags, tagFollows, tags } from "@/database/schema";
import { aiIdSchema, tagDto } from "@/domains/tags/dto/tagRequests";
import { manageTags } from "@/domains/tags/policy";
import { tagNameKey } from "@/domains/tags/shared/tagNames";
import { slugify } from "@/core/slug";
import { and, eq, like, ne } from "drizzle-orm";
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

    // Слаг не меняется при переименовании, поэтому при совпадении — первый свободный суффикс
    const taken = new Set((await db.select({ slug: tags.slug }).from(tags).where(like(tags.slug, `${base}%`))).map(t => t.slug));
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
  Рубрика снимается с постов, посты остаются, подписки на неё удаляются. Связи чистим сами:
  PRAGMA foreign_keys не включён, и cascade из схемы не сработает
*/
export const deleteTagAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ] }) => {
    await CONTAINER.boucerService.breakIfCant(manageTags);

    db.transaction(tx => {
      tx.delete(postTags).where(eq(postTags.tagId, id)).run();
      tx.delete(tagFollows).where(eq(tagFollows.tagId, id)).run();
      tx.delete(tags).where(eq(tags.id, id)).run();
    });

    revalidatePath('/office/moderation/tags');
    revalidatePath('/office/follows');

    return { done: true };
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
