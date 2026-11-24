import 'server-only';
import { embedEnabled } from "@/globals/ai";
import { aiConfig } from "@/config/ai";
import { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { semanticCandidateIds } from "@/domains/posts/shared/loadFeed";
import { ensureEmbeddings, loadVectors } from "@/domains/posts/shared/postEmbeddings";
import { cardsByIds } from "@/domains/posts/shared/postCards";
import { queryVector } from "@/domains/posts/shared/postQueryVector";
import { topBySimilarity } from "@/core/vectors";

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

  if(!query.ok){
    return [];
  }

  const ids = await semanticCandidateIds({ ...filter, search });
  const top = topBySimilarity(query.vector, loadVectors(ids), aiConfig.embed.searchMin, SEMANTIC_LIMIT);

  return cardsByIds(top.map(item => item.id));
}

// Флаг для страницы: рисовать ли Suspense со смысловым блоком (п. 17)
export function semanticSearchOn(search: string | undefined){
  return embedEnabled && (search?.trim().length ?? 0) >= MIN_QUERY;
}
