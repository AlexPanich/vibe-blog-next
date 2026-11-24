import 'server-only';
import { rateLimiters } from "@/globals/rateLimiter";
import { RateLimiterRes, type RateLimiterAbstract } from "rate-limiter-flexible";

type Who = { userId: number | null, ip: string };

/*
  Лимиты генерации «Спросить блог» (спека 57, п. 16, план 57, реш. 8): минутный → суточный →
  общий. Возвращает текст для 429 или null. Если исчерпан общий, очки пользователя возвращаются:
  он не виноват. consumeOrFail не годится — он прерывает action, а здесь route
*/
export async function consumeAskLimits({ userId, ip }: Who): Promise<string | null> {
  const key = userId === null ? ip : String(userId);
  const [ minute, day ] = userId === null
    ? [ rateLimiters.aiAskGuest, rateLimiters.aiAskGuestDay ]
    : [ rateLimiters.aiAsk, rateLimiters.aiAskDay ];

  const minuteLeft = await consume(minute, key);

  if(minuteLeft !== null){
    return `Слишком много вопросов, повторите через ${Math.ceil(minuteLeft / 1000)} с`;
  }

  if(await consume(day, key) !== null){
    await minute.reward(key);

    return 'Лимит вопросов на сегодня исчерпан, попробуйте завтра';
  }

  if(await consume(rateLimiters.aiAskGlobal, 'all') !== null){
    await Promise.all([ minute.reward(key), day.reward(key) ]);

    return 'Блог сегодня ответил на все вопросы, что мог';
  }

  return null;
}

// null — очко списано, иначе — мс до следующего
async function consume(limiter: RateLimiterAbstract, key: string){
  try {
    await limiter.consume(key);

    return null;
  }
  catch(error){
    if(error instanceof RateLimiterRes){
      return error.msBeforeNext;
    }

    throw error;
  }
}
