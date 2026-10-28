'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { authorRequests, users } from "@/database/schema";
import { AUTHOR_REQUEST_PAUSE_DAYS, authorRequestDto } from "@/domains/users/dto/authorRequestRequests";
import { authorRequestState } from "@/domains/users/shared/authorRequests";
import { parseRoles } from "@/domains/users/shared/userRoles";
import { adminIds, deleteAuthorRequestNotifications, notify, publishNotifications } from "@/domains/notifications/exports/notify";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

/*
  Заявка на роль автора (спека 28). Роли и ожидающая заявка перечитываются в транзакции:
  форма могла устареть, а вторую ожидающую не пустит и уникальный индекс
*/
export const createAuthorRequestAction = actionAuthClient
  .inputSchema(authorRequestDto)
  .action(async ({ parsedInput, ctx: { auth } }) => {
    const notificationIds = db.transaction(tx => {
      const me = tx.select({ roles: users.roles }).from(users).where(eq(users.id, auth.id)).get();

      if(!me || parseRoles(me.roles).includes('author')){
        actionError(409, 'У вас уже есть роль автора');
      }

      const state = authorRequestState(auth.id, tx);

      if(state.pending){
        actionError(409, 'Заявка уже ждёт рассмотрения');
      }

      if(state.nextAt){
        actionError(409, `После отказа новую заявку можно подать через ${AUTHOR_REQUEST_PAUSE_DAYS} дней`);
      }

      tx.insert(authorRequests).values({ userId: auth.id, text: parsedInput.text }).run();

      return notify(tx, 'author_request.created', adminIds(tx), { actorId: auth.id });
    });

    publishNotifications(notificationIds);

    return redirect('/office/author-request');
  });

// Отозванная заявка удаляется целиком: истории и паузы у неё нет
export const withdrawAuthorRequestAction = actionAuthClient
  .action(async ({ ctx: { auth } }) => {
    db.transaction(tx => {
      const removed = tx.delete(authorRequests)
        .where(and(eq(authorRequests.userId, auth.id), eq(authorRequests.status, 'pending')))
        .returning({ id: authorRequests.id })
        .all();

      if(removed.length === 0){
        actionError(409, 'Заявку уже рассмотрели — обновите страницу');
      }

      deleteAuthorRequestNotifications(tx, auth.id);
    });

    return redirect('/office/author-request');
  });
