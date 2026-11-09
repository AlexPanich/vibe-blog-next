'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { auth } from "@/globals/auth";
import { sendToQueue } from "@/globals/queue";
import { rateLimiters } from "@/globals/rateLimiter";
import { imageUploadDto, changeEmailDto, changePasswordDto, userBioDto } from "@/domains/users/dto/authRequests";
import { AVATAR_SIZES, COVER_WIDTHS } from "@/core/imageUrl";
import { readImage, saveSquareVariants, saveWidthVariants } from "@/shared/images";
import { removeUploads } from "@/globals/uploads";
import { db } from "@/globals/db";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { consumeOrFail } from "@/shared/rateLimitAction";
import { emailChangeRequestedMail, passwordChangedMail } from "@/shared/mails";
import { APIError, BASE_ERROR_CODES } from "better-auth";
import { returnValidationErrors } from "next-safe-action";
import { headers } from "next/headers";

/*
  Обе формы проверяют текущий пароль — это перебор пароля обладателем сессии,
  поэтому у них общий лимит credentialCheck по id пользователя
*/

export const changePasswordAction = actionAuthClient
  .inputSchema(changePasswordDto)
  .action(async ({ parsedInput, ctx: { auth: user } }) => {
    await consumeOrFail(rateLimiters.credentialCheck, String(user.id));

    try{
      // revokeOtherSessions: другие устройства вылетают, текущему nextCookies() ставит новую сессию
      await auth.api.changePassword({
        body: { currentPassword: parsedInput.current, newPassword: parsedInput.password, revokeOtherSessions: true },
        headers: await headers()
      });
    }
    catch(e){
      if(isApiError(e, BASE_ERROR_CODES.INVALID_PASSWORD.code)){
        wrongCurrentPassword(changePasswordDto);
      }

      if(isApiError(e, BASE_ERROR_CODES.CREDENTIAL_ACCOUNT_NOT_FOUND.code)){
        actionError(409, 'Пароля нет: вы входите через GitHub. Задайте его через восстановление');
      }

      throw e;
    }

    await rateLimiters.credentialCheck.delete(String(user.id));
    sendToQueue('mail.send', { to: user.email, ...passwordChangedMail() });

    return { done: true };
  });

export const changeEmailAction = actionAuthClient
  .inputSchema(changeEmailDto)
  .action(async ({ parsedInput, ctx: { auth: user } }) => {
    await consumeOrFail(rateLimiters.credentialCheck, String(user.id));

    if(parsedInput.email === user.email){
      returnValidationErrors(changeEmailDto, { email: { _errors: [ 'Это ваш текущий email' ] } });
    }

    const reqHeaders = await headers();

    try{
      await auth.api.verifyPassword({ body: { password: parsedInput.current }, headers: reqHeaders });
    }
    catch(e){
      if(isApiError(e, BASE_ERROR_CODES.INVALID_PASSWORD.code)){
        wrongCurrentPassword(changeEmailDto);
      }

      throw e;
    }

    await rateLimiters.credentialCheck.delete(String(user.id));
    /* после пароля, как в resendVerificationAction: иначе любой выжжет квоту чужого ящика */
    await consumeOrFail(rateLimiters.verificationEmail, parsedInput.email);
    /* занятый адрес better-auth не раскрывает: ответ тот же, письма нет */
    await auth.api.changeEmail({ body: { newEmail: parsedInput.email, callbackURL: '/office/profile' }, headers: reqHeaders });
    /* при запросе, а не после применения: ни один хук better-auth не получает старый адрес */
    sendToQueue('mail.send', { to: user.email, ...emailChangeRequestedMail(parsedInput.email) });

    return { sentTo: parsedInput.email };
  });

export const updateBioAction = actionAuthClient
  .inputSchema(userBioDto)
  .action(async ({ parsedInput, ctx: { auth: user } }) => {
    const nameGenitive = parsedInput.nameGenitive || null;
    const old = db.transaction(tx => {
      const row = tx.select({ nameGenitive: users.nameGenitive }).from(users).where(eq(users.id, user.id)).get();
      tx.update(users).set({ bio: parsedInput.bio || null, nameGenitive }).where(eq(users.id, user.id)).run();

      return row?.nameGenitive ?? null;
    });
    revalidatePath(`/authors/${user.id}`);

    // «Ещё у …» на закэшированных страницах постов (спека 41): сброс — только если имя сменилось
    if(old !== nameGenitive){
      revalidatePath('/posts/[id]', 'page');
    }

    return { done: true };
  });

export const uploadAvatarAction = actionAuthClient
  .inputSchema(imageUploadDto)
  .action(async ({ parsedInput: { file }, ctx: { auth: user } }) => {
    await consumeOrFail(rateLimiters.imageUpload, String(user.id));

    const read = await readImage(file);

    if(!read.ok){
      returnValidationErrors(imageUploadDto, { file: { _errors: [ read.error ] } });
    }

    const { key } = await saveSquareVariants(read.buffer, AVATAR_SIZES);
    const old = await replaceImage(user.id, 'avatarKey', key);

    if(old){
      await removeUploads(old, AVATAR_SIZES);
    }

    return { avatarKey: key };
  });

export const removeAvatarAction = actionAuthClient
  .action(async ({ ctx: { auth: user } }) => {
    const old = await replaceImage(user.id, 'avatarKey', null);

    if(old){
      await removeUploads(old, AVATAR_SIZES);
    }

    return { done: true };
  });

export const uploadCoverAction = actionAuthClient
  .inputSchema(imageUploadDto)
  .action(async ({ parsedInput: { file }, ctx: { auth: user } }) => {
    await consumeOrFail(rateLimiters.imageUpload, String(user.id));

    const read = await readImage(file);

    if(!read.ok){
      returnValidationErrors(imageUploadDto, { file: { _errors: [ read.error ] } });
    }

    const { key } = await saveWidthVariants(read.buffer, COVER_WIDTHS);
    const old = await replaceImage(user.id, 'coverKey', key);

    if(old){
      await removeUploads(old, COVER_WIDTHS);
    }

    return { coverKey: key };
  });

export const removeCoverAction = actionAuthClient
  .action(async ({ ctx: { auth: user } }) => {
    const old = await replaceImage(user.id, 'coverKey', null);

    if(old){
      await removeUploads(old, COVER_WIDTHS);
    }

    return { done: true };
  });

function isApiError(e: unknown, code: string): boolean {
  return e instanceof APIError && e.body?.code === code;
}

function wrongCurrentPassword(schema: typeof changePasswordDto | typeof changeEmailDto): never {
  return returnValidationErrors(schema, { current: { _errors: [ 'Неверный текущий пароль' ] } });
}

/*
  Новый ключ аватара или обложки вместо старого; старый возвращается, чтобы стереть его
  файлы после записи
*/
async function replaceImage(userId: number, column: 'avatarKey' | 'coverKey', key: string | null){
  const old = db.transaction(tx => {
    const row = tx.select({ value: users[column] }).from(users).where(eq(users.id, userId)).get();
    tx.update(users).set({ [column]: key }).where(eq(users.id, userId)).run();

    return row?.value ?? null;
  });

  revalidatePath(`/authors/${userId}`);

  return old;
}
