'use server'

import 'server-only';
import { actionClient, actionError } from "@/globals/actionClient";
import { validate } from "@/shared/validation";
import { consumeOrFail, rateLimit, RateLimits } from "@/shared/rateLimitAction";
import { auth, USER_BANNED_CODE } from "@/globals/auth";
import { rateLimiters } from "@/globals/rateLimiter";
import { users } from "@/database/schema";
import { forgotPasswordDto, resetPasswordDto, userSigninDto, userSignupDto } from "@/domains/users/dto/authRequests";
import { APIError, BASE_ERROR_CODES } from "better-auth";
import { unique } from "drizzle-validator";
import { returnValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";

export const signupAction = actionClient
	.inputSchema(userSignupDto)
  .useValidated(rateLimit(rateLimiters.signup, ip => ip))
	.action(async ({ parsedInput }) => {
    await validate(userSignupDto, parsedInput, {
      email: unique(users.email)
    });

    /*
      В реальности тут много работы if, sendEmail итп, если мы отказались от встроенного 
      signUp с auht-client
    */

    try{
      await auth.api.signUpEmail({ body: { ...parsedInput, callbackURL: '/office' } });
    }
    catch(e){
      if(e instanceof APIError){
        returnValidationErrors(userSignupDto, {
          email:{ _errors: [ e.body?.message ?? 'Не удалось зарегистрироваться' ] }
        });
      }
      
      throw e;
    }

    redirect('/auth/signup-success');
	});

export const signinAction = actionClient
	.inputSchema(userSigninDto)
  .useValidated(rateLimit(rateLimiters.signinIp, ip => ip))
  .useValidated(rateLimit(rateLimiters.signin, (ip, { email }) => `${ip}:${email}`))
	.action(async ({ parsedInput, ctx: { rateLimits } }) => {
    try{
      await auth.api.signInEmail({ body: { ...parsedInput, callbackURL: '/office' } });
    }
    catch(e){
      if(isEmailNotVerified(e)){
        actionError(403, 'Email не подтверждён: перейдите по ссылке из письма');
      }

      throwSigninError(e, rateLimits);
    }

    /* signinIp не сбрасываем: иначе вход в свой аккаунт обнулял бы счётчик перебора */
    await rateLimits.find(rateLimiters.signin).reset();
    redirect('/office');
	});

/*
  Повторное письмо верификации. Принимает те же email и пароль, что форма входа: письмо уходит,
  только если пароль верный, — на чужой адрес его не отправить
*/
export const resendVerificationAction = actionClient
	.inputSchema(userSigninDto)
  .useValidated(rateLimit(rateLimiters.signinIp, ip => ip))
  .useValidated(rateLimit(rateLimiters.signin, (ip, { email }) => `${ip}:${email}`))
	.action(async ({ parsedInput, ctx: { rateLimits } }) => {
    try{
      await auth.api.signInEmail({ body: { ...parsedInput, callbackURL: '/office' } });
    }
    catch(e){
      if(isEmailNotVerified(e)){
        /* лимит писем — только после проверки пароля, иначе любой выжжет квоту чужого ящика */
        await consumeOrFail(rateLimiters.verificationEmail, parsedInput.email);
        await auth.api.sendVerificationEmail({ body: { email: parsedInput.email, callbackURL: '/office' } });
        return { sent: true };
      }

      throwSigninError(e, rateLimits);
    }

    /* email уже подтверждён, и это обычный успешный вход */
    await rateLimits.find(rateLimiters.signin).reset();
    redirect('/office');
	});

/*
  Ответ всегда один и тот же — по форме нельзя узнать, есть ли такой email. Поэтому и лимит
  по email списывается молча: по 429 тоже было бы видно, что адрес существует
*/
export const requestPasswordResetAction = actionClient
	.inputSchema(forgotPasswordDto)
  .useValidated(rateLimit(rateLimiters.passwordResetIp, ip => ip))
	.action(async ({ parsedInput }) => {
    const allowed = await rateLimiters.passwordResetEmail.consume(parsedInput.email).then(() => true, () => false);

    if(allowed){
      await auth.api.requestPasswordReset({ body: { email: parsedInput.email } });
    }

    return { sent: true };
	});

export const resetPasswordAction = actionClient
	.inputSchema(resetPasswordDto)
	.action(async ({ parsedInput }) => {
    try{
      await auth.api.resetPassword({ body: { token: parsedInput.token, newPassword: parsedInput.password } });
    }
    catch(e){
      if(e instanceof APIError && e.body?.code === BASE_ERROR_CODES.INVALID_TOKEN.code){
        actionError(410, 'Ссылка больше не работает — она одноразовая и действует час');
      }

      throw e;
    }

    return { done: true };
	});

function isBanned(e: unknown): e is APIError {
  return e instanceof APIError && e.body?.code === USER_BANNED_CODE;
}

function isEmailNotVerified(e: unknown): boolean {
  return e instanceof APIError && e.body?.code === BASE_ERROR_CODES.EMAIL_NOT_VERIFIED.code;
}

function throwSigninError(e: unknown, rateLimits: RateLimits): never {
  /* 423, а не 403: по 403 LoginForm предлагает повторное письмо верификации */
  if(isBanned(e)){
    const reason = e.body?.message ?? '';
    // until кладёт хук входа в globals/auth.ts (спека 46)
    const until = typeof e.body?.until === 'string' ? e.body.until : null;

    actionError(423, `Аккаунт заблокирован: ${reason}`, { ban: { reason, until } });
  }

  if(e instanceof APIError){
    const left = rateLimits.find(rateLimiters.signin).result.remainingPoints;

    returnValidationErrors(userSigninDto, {
      password: { _errors: [ `${e.body?.message ?? 'Не удалось войти на сайт'}. Осталось попыток: ${left}` ] }
    });
  }

  throw e;
}