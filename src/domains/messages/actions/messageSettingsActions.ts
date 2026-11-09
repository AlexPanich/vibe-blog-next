'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { liveBus } from "@/globals/liveBus";
import { messageIgnores, messageRestrictions, users } from "@/database/schema";
import { aiIdSchema, messageIgnoreDto, messageRestrictDto, messagesFromDto } from "@/domains/messages/dto/messageRequests";
import { MESSAGE_IGNORES_LIMIT } from "@/domains/messages/shared/messageAccess";
import { deletePeerNotifications } from "@/domains/messages/shared/messageNotifications";
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/*
  «Запретить писать»: этот человек больше не может мне написать, история остаётся у обоих.
  Снимается той же кнопкой
*/
export const restrictMessagesAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(messageRestrictDto)
  .action(async ({ parsedInput: { restrict }, bindArgsParsedInputs: [ userId ], ctx: { auth } }) => {
    const own = and(eq(messageRestrictions.userId, auth.id), eq(messageRestrictions.restrictedId, userId));

    if(userId === auth.id){
      actionError(403, 'Себе запретить нельзя');
    }

    db.transaction(tx => {
      if(!restrict){
        tx.delete(messageRestrictions).where(own).run();
        return;
      }

      ensureUser(tx, userId);
      tx.insert(messageRestrictions).values({ userId: auth.id, restrictedId: userId }).onConflictDoNothing().run();
    });

    revalidateMessages();

    return { restricted: restrict };
  });

/*
  «Скрыть переписку»: моя связь, собеседник о ней не знает. Ставится и до первого сообщения
*/
export const ignoreMessagesAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(messageIgnoreDto)
  .action(async ({ parsedInput: { ignore }, bindArgsParsedInputs: [ userId ], ctx: { auth } }) => {
    const own = and(eq(messageIgnores.userId, auth.id), eq(messageIgnores.ignoredId, userId));

    if(userId === auth.id){
      actionError(403, 'Скрыть переписку с собой нельзя');
    }

    db.transaction(tx => {
      if(!ignore){
        tx.delete(messageIgnores).where(own).run();
        return;
      }

      ensureUser(tx, userId);

      const [ { n } ] = tx.select({ n: count() }).from(messageIgnores).where(eq(messageIgnores.userId, auth.id)).all();

      if(n >= MESSAGE_IGNORES_LIMIT && !tx.select().from(messageIgnores).where(own).get()){
        actionError(409, `Не больше ${MESSAGE_IGNORES_LIMIT} скрытых переписок`);
      }

      tx.insert(messageIgnores).values({ userId: auth.id, ignoredId: userId }).onConflictDoNothing().run();
      deletePeerNotifications(tx, auth.id, userId);
    });

    // Счётчик в меню других вкладок без этой переписки
    liveBus.publish(auth.id, 'message.read', { dialogId: null });
    revalidateMessages();

    return { ignored: ignore };
  });

// Страница автора открытого поста получит правило при следующем messageStateAction — кэш не сбрасываем
export const updateMessagesFromAction = actionAuthClient
  .inputSchema(messagesFromDto)
  .action(async ({ parsedInput: { messagesFrom }, ctx: { auth } }) => {
    db.update(users).set({ messagesFrom }).where(eq(users.id, auth.id)).run();
    revalidatePath('/office/profile');

    return { messagesFrom };
  });

type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function ensureUser(tx: DBTransaction, userId: number){
  if(!tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).get()){
    actionError(404, 'Пользователь не найден');
  }
}

function revalidateMessages(){
  revalidatePath('/office/messages', 'layout');
  revalidatePath('/authors/[id]', 'page');
}
