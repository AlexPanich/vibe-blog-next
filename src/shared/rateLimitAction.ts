import 'server-only';
import { actionError, ActionServerError } from "@/globals/actionClient";
import { getUserIp } from "@/shared/request";
import { createValidatedMiddleware } from "next-safe-action";
import { RateLimiterAbstract, RateLimiterRes } from "rate-limiter-flexible";

/*
  Middleware для .useValidated(): списывает очко у limiter по ключу из ip и входных данных.
  Каждый вызов добавляет свою запись в ctx.rateLimits, сбрасывать счётчики решает action.
*/
export function rateLimit<Input>(limiter: RateLimiterAbstract, makeKey: (ip: string, input: Input) => string) {
  /* ctx не типизирован: тип { rateLimits?: … } не принял бы ctx вида { auth } (weak type) */
  return createValidatedMiddleware<{ serverError: ActionServerError, parsedInput: Input }>()
    .define(async ({ next, ctx, parsedInput }) => {
      const key = makeKey(await getUserIp(), parsedInput);
      const prev = 'rateLimits' in ctx && ctx.rateLimits instanceof RateLimits ? ctx.rateLimits : undefined;
      const result = await consumeOrFail(limiter, key);
      const entry: RateLimitEntry = { limiter, result, reset: () => limiter.delete(key) };
      return next({ ctx: { rateLimits: new RateLimits(prev, entry) } });
    });
}

/*
  Списать очко внутри action, а не в цепочке — когда очко можно тратить только после проверки
  (например, после пароля). При превышении прерывает action так же, как middleware.
*/
export async function consumeOrFail(limiter: RateLimiterAbstract, key: string): Promise<RateLimiterRes> {
  try{
    return await limiter.consume(key);
  }
  catch(e: unknown){
    if(e instanceof RateLimiterRes){
      actionError(429, `Слишком много попыток, повторите через ${Math.ceil(e.msBeforeNext / 1000)} с`);
    }

    throw e;
  }
}

export type RateLimitEntry = {
  limiter: RateLimiterAbstract,
  result: RateLimiterRes,
  reset: () => Promise<boolean>
}

/* Лимиты, пройденные в цепочке action. Доступа по индексу нет: только обход и поиск по limiter */
export class RateLimits {
  readonly #entries: RateLimitEntry[];

  constructor(prev: RateLimits | undefined, entry: RateLimitEntry) {
    this.#entries = prev ? [ ...prev.#entries, entry ] : [ entry ];
  }

  /* в отличие от Array.forEach ждёт все промисы: forEach(l => l.reset()) можно await-ить */
  async forEach(fn: (entry: RateLimitEntry) => unknown): Promise<void> {
    await Promise.all(this.#entries.map(fn));
  }

  find(limiter: RateLimiterAbstract): RateLimitEntry {
    const entry = this.#entries.find(e => e.limiter === limiter);

    if(!entry){
      throw new Error(`Limiter "${limiter.keyPrefix}" is not in action chain`);
    }

    return entry;
  }
}
