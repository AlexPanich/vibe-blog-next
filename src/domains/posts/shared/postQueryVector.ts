import 'server-only';
import { aiEmbed, embedModel, LlmError } from "@/globals/ai";
import { queryEmbeddings } from "@/globals/queryEmbeddings";
import { rateLimiters } from "@/globals/rateLimiter";
import { getUserIp } from "@/shared/request";

export type QueryVectorResult = { ok: true, vector: Float32Array } | { ok: false, reason: 'limit' | 'error' };

/*
  Вектор запроса (спека 56, п. 18; общий у ленты и «Спросить блог», спека 57, п. 5): кэш →
  лимит aiSearch по IP → модель. Очко списывается только при промахе кэша; в кэш попадает
  только успех. Причина отказа нужна вопросу (план 57, реш. 5): лимит — 429, сбой модели — 503
*/
export async function queryVector(search: string): Promise<QueryVectorResult> {
  const key = `${embedModel}\n${normalizeQuery(search)}`;
  const cached = queryEmbeddings.get(key);

  if(cached){
    return { ok: true, vector: cached };
  }

  try {
    await rateLimiters.aiSearch.consume(await getUserIp());
  }
  catch {
    return { ok: false, reason: 'limit' };
  }

  try {
    const { vectors } = await aiEmbed({ texts: [ search ], kind: 'query' });

    queryEmbeddings.set(key, vectors[0]);

    return { ok: true, vector: vectors[0] };
  }
  catch(error){
    console.error('Вектор запроса', error instanceof LlmError ? error.message : error);

    return { ok: false, reason: 'error' };
  }
}

function normalizeQuery(search: string){
  return search.trim().toLocaleLowerCase('ru').replace(/\s+/g, ' ');
}
