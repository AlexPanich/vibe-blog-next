import 'server-only';
import { IRateLimiterOptions, RateLimiterMemory } from "rate-limiter-flexible";

export const rateLimiters = {
  /* на каждый request, см. proxy.ts */
  globalSec: memoryLimiter({ keyPrefix: 'global-sec', points: 30, duration: 1 }),
  globalMin: memoryLimiter({ keyPrefix: 'global-min', points: 300, duration: 60 }),

  /* под конкретные страницы мб */
  signin: memoryLimiter({
    keyPrefix: 'signin',
    points: 5,
    duration: 60,
    blockDuration: 60 * 5
  }),
  /* перебор популярных паролей по разным email с одного ip */
  signinIp: memoryLimiter({ keyPrefix: 'signin-ip', points: 60, duration: 60 * 60 }),
  signup: memoryLimiter({ keyPrefix: 'signup', points: 5, duration: 60 * 60 }),
  /* повторная отправка письма верификации, ключ — email: защищает ящик, а не аккаунт */
  verificationEmail: memoryLimiter({ keyPrefix: 'verification-email', points: 3, duration: 60 * 60 }),
  /* запрос письма сброса: по ip с запасом на NAT, по email — защищает ящик, списывается молча */
  passwordResetIp: memoryLimiter({ keyPrefix: 'password-reset-ip', points: 20, duration: 60 * 60 }),
  passwordResetEmail: memoryLimiter({ keyPrefix: 'password-reset-email', points: 3, duration: 60 * 60 }),
  /* новые комментарии, ключ — id пользователя; правку и реакции держит глобальный лимит */
  commentCreate: memoryLimiter({ keyPrefix: 'comment-create', points: 10, duration: 60 }),
  /* жалобы на комментарии, ключ — id пользователя */
  commentReport: memoryLimiter({ keyPrefix: 'comment-report', points: 30, duration: 60 * 60 }),
  /* жалобы на посты (спека 36), ключ — id пользователя */
  postReport: memoryLimiter({ keyPrefix: 'post-report', points: 10, duration: 60 * 60 }),
  /* личные сообщения и новые диалоги, ключ — id пользователя */
  messageSend: memoryLimiter({ keyPrefix: 'message-send', points: 30, duration: 60 }),
  dialogCreate: memoryLimiter({ keyPrefix: 'dialog-create', points: 20, duration: 60 * 60 }),
  /* картинки постов и аватары, ключ — id пользователя */
  imageUpload: memoryLimiter({ keyPrefix: 'image-upload', points: 60, duration: 60 * 60 }),
  /* перебор текущего пароля обладателем сессии (смена пароля и email), ключ — id пользователя */
  credentialCheck: memoryLimiter({
    keyPrefix: 'credential-check',
    points: 5,
    duration: 60,
    blockDuration: 60 * 5
  }),
};

export type RATE_LIMITERS = typeof rateLimiters;

/*
  Каждый инстанс кэшируется в globalThis по своим настройкам, чтобы счётчики переживали HMR в dev.
  Кэшировать весь объект нельзя: после HMR в нём не было бы новых limiter-ов (undefined до рестарта),
  а изменённые числа не применялись бы. Здесь новый или изменённый limiter просто создаётся заново.
*/
function memoryLimiter(options: IRateLimiterOptions): RateLimiterMemory {
  const store = globalThis as unknown as { rateLimiterCache?: Map<string, RateLimiterMemory> };
  const cache = store.rateLimiterCache ??= new Map();
  const id = JSON.stringify(options);
  let limiter = cache.get(id);

  if(!limiter){
    limiter = new RateLimiterMemory(options);
    cache.set(id, limiter);
  }

  return limiter;
}
