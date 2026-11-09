'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient } from "@/globals/actionClient";
import { sessions, userAdminActions, users } from "@/database/schema";
import { aiIdSchema, userBanDto, userRemoveImageDto, userRolesDto, userUnbanDto } from "@/domains/users/dto/userAdminRequests";
import { AVATAR_SIZES, COVER_WIDTHS } from "@/core/imageUrl";
import { removeUploads } from "@/globals/uploads";
import { manageUser } from "@/domains/users/policy";
import { parseRoles, serializeRoles } from "@/domains/users/shared/userRoles";
import { adminTransaction, staleError } from "@/domains/users/shared/userAdminTransaction";
import { closePendingAuthorRequest } from "@/domains/users/shared/authorRequests";
import { notify, publishNotifications } from "@/domains/notifications/exports/notify";
import { liveBus } from "@/globals/liveBus";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const updateUserRolesAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(userRolesDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(u => manageUser(u, { id }));

    const notificationIds = adminTransaction(auth.id, id, (tx, target) => {
      const current = parseRoles(target.roles);

      if(serializeRoles(current) !== serializeRoles(parsedInput.expected)){
        staleError();
      }

      const granted = parsedInput.roles.filter(role => !current.includes(role));
      const revoked = current.filter(role => !parsedInput.roles.includes(role));

      if(granted.length === 0 && revoked.length === 0){
        return [];
      }

      tx.update(users).set({ roles: serializeRoles(parsedInput.roles) }).where(eq(users.id, id)).run();

      // Роль автора выдали руками — ожидающая заявка закрывается одобренной (спека 28)
      if(granted.includes('author')){
        closePendingAuthorRequest(tx, id, auth.id);
      }

      tx.insert(userAdminActions).values([
        ...granted.map(role => ({ userId: id, actorId: auth.id, action: 'role_granted' as const, role })),
        ...revoked.map(role => ({ userId: id, actorId: auth.id, action: 'role_revoked' as const, role })),
      ]).run();

      return [
        ...granted.flatMap(role => notify(tx, 'user.role_granted', [ id ], { actorId: auth.id, role })),
        ...revoked.flatMap(role => notify(tx, 'user.role_revoked', [ id ], { actorId: auth.id, role })),
      ];
    });

    publishNotifications(notificationIds);

    return redirect(`/office/admin/users/${id}`);
  });

export const banUserAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(userBanDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(u => manageUser(u, { id }));

    adminTransaction(auth.id, id, (tx, target) => {
      if(target.bannedAt){
        staleError();
      }

      tx.update(users).set({ bannedAt: new Date(), banReason: parsedInput.comment }).where(eq(users.id, id)).run();
      // Новую сессию не даст хук в globals/auth.ts, а действующие гасим здесь
      tx.delete(sessions).where(eq(sessions.userId, id)).run();
      tx.insert(userAdminActions).values({ userId: id, actorId: auth.id, action: 'banned', comment: parsedInput.comment }).run();
    });

    // Живые потоки уходят вместе с сессиями
    liveBus.closeUser(id);

    return redirect(`/office/admin/users/${id}`);
  });

export const unbanUserAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(userUnbanDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(u => manageUser(u, { id }));

    const notificationIds = adminTransaction(auth.id, id, (tx, target) => {
      if(!target.bannedAt){
        staleError();
      }

      tx.update(users).set({ bannedAt: null, banReason: null }).where(eq(users.id, id)).run();
      tx.insert(userAdminActions).values({ userId: id, actorId: auth.id, action: 'unbanned', comment: parsedInput.comment || null }).run();

      return notify(tx, 'user.unbanned', [ id ], { actorId: auth.id });
    });

    publishNotifications(notificationIds);

    return redirect(`/office/admin/users/${id}`);
  });

/*
  На случай неприемлемой картинки. Файлы стираются после транзакции
*/
export const removeUserAvatarAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(userRemoveImageDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(u => manageUser(u, { id }));

    const notificationIds = adminTransaction(auth.id, id, (tx, target) => {
      if(target.avatarKey !== parsedInput.expected){
        staleError();
      }

      tx.update(users).set({ avatarKey: null }).where(eq(users.id, id)).run();
      tx.insert(userAdminActions).values({ userId: id, actorId: auth.id, action: 'avatar_removed', comment: parsedInput.comment || null }).run();

      return notify(tx, 'user.avatar_removed', [ id ], { actorId: auth.id });
    });

    publishNotifications(notificationIds);

    await removeUploads(parsedInput.expected, AVATAR_SIZES);

    return redirect(`/office/admin/users/${id}`);
  });

/*
  Обложка профиля (спека 41) — так же, как аватар
*/
export const removeUserCoverAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(userRemoveImageDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(u => manageUser(u, { id }));

    const notificationIds = adminTransaction(auth.id, id, (tx, target) => {
      if(target.coverKey !== parsedInput.expected){
        staleError();
      }

      tx.update(users).set({ coverKey: null }).where(eq(users.id, id)).run();
      tx.insert(userAdminActions).values({ userId: id, actorId: auth.id, action: 'cover_removed', comment: parsedInput.comment || null }).run();

      return notify(tx, 'user.cover_removed', [ id ], { actorId: auth.id });
    });

    publishNotifications(notificationIds);

    await removeUploads(parsedInput.expected, COVER_WIDTHS);
    revalidatePath(`/authors/${id}`);

    return redirect(`/office/admin/users/${id}`);
  });
