import 'server-only';
import { aiEmbed, embedEnabled, embedModel, LlmError } from "@/globals/ai";
import { aiConfig } from "@/config/ai";
import { queryEmbeddings } from "@/globals/queryEmbeddings";
import { rateLimiters } from "@/globals/rateLimiter";
import { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { semanticCandidateIds } from "@/domains/posts/shared/loadFeed";
import { ensureEmbeddings, loadVectors } from "@/domains/posts/shared/postEmbeddings";
import { cardsByIds } from "@/domains/posts/shared/postCards";
import { topBySimilarity } from "@/core/vectors";
import { getUserIp } from "@/shared/request";

const SEMANTIC_LIMIT = 6;

const MIN_QUERY = 3;

/*
  «Похоже по смыслу» под лентой с поиском (спека 56, п. 12–18): до 6 постов под теми же
  фильтрами, которых нет среди найденных по словам, по сходству с запросом не ниже searchMin.
  Любой сбой модели, таймаут или лимит — пустой список: блок молча пропадает
*/
export async function semanticFeed(filter: Omit<PostFeedFilterDto, 'limit'>){
  const search = filter.search?.trim() ?? '';

  if(!semanticSearchOn(search)){
    return [];
  }

  ensureEmbeddings();

  const query = await queryVector(search);

  if(!query){
    return [];
  }

  const ids = await semanticCandidateIds({ ...filter, search });
  const top = topBySimilarity(query, loadVectors(ids), aiConfig.embed.searchMin, SEMANTIC_LIMIT);

  return cardsByIds(top.map(item => item.id));
}

// Флаг для страницы: рисовать ли Suspense со смысловым блоком (п. 17)
export function semanticSearchOn(search: string | undefined){
  return embedEnabled && (search?.trim().length ?? 0) >= MIN_QUERY;
}

/*
  Вектор запроса: кэш → лимит aiSearch по IP → модель. Очко списывается только при промахе
  кэша; consume бросает RateLimiterRes — блока нет, ошибки нет. В кэш попадает только успех
*/
async function queryVector(search: string){
  const key = `${embedModel}\n${normalizeQuery(search)}`;
  const cached = queryEmbeddings.get(key);

  if(cached){
    return cached;
  }

  try {
    await rateLimiters.aiSearch.consume(await getUserIp());
  }
  catch {
    return null;
  }

  try {
    const { vectors } = await aiEmbed({ texts: [ search ], kind: 'query' });

    queryEmbeddings.set(key, vectors[0]);

    return vectors[0];
  }
  catch(error){
    console.error('Вектор запроса', error instanceof LlmError ? error.message : error);

    return null;
  }
}

function normalizeQuery(search: string){
  return search.trim().toLocaleLowerCase('ru').replace(/\s+/g, ' ');
}
