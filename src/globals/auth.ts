import 'server-only';
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/globals/db";
import *  as schema from '@/database/schema'
import { and, eq, isNotNull, like, lte } from "drizzle-orm";
import { isBanActive } from "@/shared/userBan";
import { sendToQueue } from "@/globals/queue";
import { authConfig } from "@/config/auth";
import { passwordChangedMail, resetPasswordMail } from "@/shared/mails";

/*
  Код ошибки входа забаненного пользователя, message — причина бана
*/
export const USER_BANNED_CODE = 'USER_BANNED';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: schema,
    usePlural: true
  }),
  emailAndPassword: { 
    enabled: true,
    requireEmailVerification: true,
    /*
      Ссылку собираем сами, на нашу страницу: url от better-auth ведёт на HTTP-эндпоинт
      /reset-password/:token, а он вне whitelist в api/auth/[...all]
    */
    sendResetPassword: async ({ user, token }) => {
      sendToQueue('mail.send', {
        to: user.email,
        ...resetPasswordMail(`${authConfig.baseUrl}/auth/reset-password?token=${token}`)
      });
    },
    revokeSessionsOnPasswordReset: true,
    onPasswordReset: async ({ user }) => {
      db.transaction(tx => {
        /* better-auth стирает только применённый токен: ссылки из прошлых писем гасим сами */
        tx.delete(schema.verifications)
          .where(and(like(schema.verifications.identifier, 'reset-password:%'), eq(schema.verifications.value, String(user.id))))
          .run();
        /* переход по ссылке доказывает владение ящиком — иначе неподтверждённый так и не войдёт */
        tx.update(schema.users).set({ emailVerified: true }).where(eq(schema.users.id, Number(user.id))).run();
      });

      sendToQueue('mail.send', { to: user.email, ...passwordChangedMail() });
    }
  },
  emailVerification: {
    sendVerificationEmail: async ({ url, user }) => {
      //await new Promise(r => setTimeout(r, 3000))
      //console.log(`email,  ${url} ${token}`);
      sendToQueue('auth.send-verification-email', {
        url,
        email: user.email
      })
    },
    sendOnSignUp: true,
    /*
      Не отправлять при входе: иначе каждая попытка входа в неподтверждённый аккаунт — письмо.
      Повторная отправка — отдельной кнопкой, resendVerificationAction со своим лимитом
    */
    sendOnSignIn: false,
    autoSignInAfterVerification: true
  },
  user: {
    /*
      Без sendChangeEmailConfirmation: письмо уходит сразу на новый адрес через
      sendVerificationEmail, после перехода emailVerified = true. Защита от украденной
      сессии — текущий пароль в changeEmailAction
    */
    changeEmail: { enabled: true },
    additionalFields: {
      roles: {
        type: 'string[]',
        required: false,
        defaultValue: [],
        input: false // клиент не может передать roles при регистрации
      },
      // В сессии — чтобы шапка показала новый аватар без перелогина; меняют только наши actions
      avatarKey: {
        type: 'string',
        required: false,
        input: false
      }
    }
  },
  databaseHooks: {
    session: {
      create: {
        /*
          Сессия создаётся после проверки пароля и для любого способа входа, поэтому бан
          проверяется здесь: чужой бан по email не раскрыть. Приём — как в плагине better-auth
          admin, но колонки бана свои, better-auth их не знает — читаем напрямую.
          Срок (спека 46): действующий бан уходит в ошибку вместе с until, истёкший здесь же
          лениво чистится и вход идёт. Это уборка, а не событие — без журнала и уведомления.
          UPDATE условный: если admin успел забанить заново, новый срок под него не попадёт
        */
        before: async session => {
          const userId = Number(session.userId);
          const user = await db.query.users.findFirst({
            where: eq(schema.users.id, userId),
            columns: { bannedAt: true, banReason: true, bannedUntil: true }
          });
          const now = new Date();

          if(user && isBanActive(user, now)){
            throw new APIError('FORBIDDEN', { code: USER_BANNED_CODE, message: user.banReason ?? '', until: user.bannedUntil?.toISOString() ?? null });
          }
          else if(user?.bannedAt){
            db.update(schema.users)
              .set({ bannedAt: null, banReason: null, bannedUntil: null })
              .where(and(eq(schema.users.id, userId), isNotNull(schema.users.bannedUntil), lte(schema.users.bannedUntil, now)))
              .run();
          }
        }
      }
    }
  },
  advanced: {
    database: {
      generateId: false
    }
  },
  socialProviders: {
    github: authConfig.github
  },
  /*
    Ставит Set-Cookie при вызове auth.api.* из server actions.
    Должен быть последним в списке плагинов
  */
  plugins: [ nextCookies() ]
});
