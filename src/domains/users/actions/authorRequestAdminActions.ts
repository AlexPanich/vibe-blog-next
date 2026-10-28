'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { authorRequests, userAdminActions, users } from "@/database/schema";
import { authorRequestIdSchema, authorRequestRejectDto } from "@/domains/users/dto/authorRequestRequests";
import { manageUser } from "@/domains/users/policy";
import { parseRoles, serializeRoles } from "@/domains/users/shared/userRoles";
import { adminTransaction, type DBTransaction } from "@/domains/users/shared/userAdminTransaction";
import { deleteAuthorRequestNotifications, notify, publishNotifications } from "@/domains/notifications/exports/notify";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

/*
  Одобрение: заявка, роль, журнал и уведомление — одной транзакцией. Роль могли выдать
  руками раньше — тогда заявка уже закрыта и сюда не дойдёт (409)
*/
export const approveAuthorRequestAction = actionAuthClient
  .bindArgsSchemas([ authorRequestIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const userId = await authorizeDecision(id);

    const notificationIds = adminTransaction(auth.id, userId, (tx, target) => {
      decide(tx, id, { status: 'approved', reason: null, decidedBy: auth.id });

      const roles = parseRoles(target.roles);

      if(roles.includes('author')){
        return [];
      }

      tx.update(users).set({ roles: serializeRoles([ ...roles, 'author' ]) }).where(eq(users.id, userId)).run();
      tx.insert(userAdminActions).values({ userId, actorId: auth.id, action: 'role_granted', role: 'author', comment: 'По заявке' }).run();

      return notify(tx, 'user.role_granted', [ userId ], { actorId: auth.id, role: 'author' });
    });

    publishNotifications(notificationIds);
  });

export const rejectAuthorRequestAction = actionAuthClient
  .bindArgsSchemas([ authorRequestIdSchema ])
  .inputSchema(authorRequestRejectDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const userId = await authorizeDecision(id);

    const notificationIds = adminTransaction(auth.id, userId, tx => {
      decide(tx, id, { status: 'rejected', reason: parsedInput.reason, decidedBy: auth.id });

      return notify(tx, 'author_request.rejected', [ userId ], { actorId: auth.id });
    });

    publishNotifications(notificationIds);
  });

// Свою заявку admin не решает — как свои роли (manageUser)
async function authorizeDecision(id: number){
  const request = await db.query.authorRequests.findFirst({ where: eq(authorRequests.id, id), columns: { userId: true } });

  if(!request){
    return notFound();
  }

  await CONTAINER.boucerService.breakIfCant(u => manageUser(u, { id: request.userId }));

  return request.userId;
}

// Атомарно из pending: заявку могли решить, отозвать или закрыть выдачей роли
function decide(tx: DBTransaction, id: number, decision: { status: 'approved' | 'rejected', reason: string | null, decidedBy: number }){
  const decided = tx.update(authorRequests)
    .set({ ...decision, decidedAt: new Date() })
    .where(and(eq(authorRequests.id, id), eq(authorRequests.status, 'pending')))
    .returning({ userId: authorRequests.userId })
    .all();

  if(decided.length === 0){
    actionError(409, 'Заявка уже рассмотрена или отозвана — обновите страницу');
  }

  deleteAuthorRequestNotifications(tx, decided[0].userId);
}
