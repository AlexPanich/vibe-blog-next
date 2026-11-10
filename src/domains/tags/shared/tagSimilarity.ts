import { levenshtein } from "@/core/levenshtein";
import { tagNameKey } from "@/domains/tags/shared/tagNames";

/*
  Подсказка о похожих рубриках (спека 47, реш. 8–10). Только подсветка в справочнике —
  ничего не сливается само
*/

// Ключ сравнения: nameKey, ё → е, без пробелов и дефисов
export function tagSimilarityKey(name: string): string {
  return tagNameKey(name).replaceAll('ё', 'е').replace(/[\s-]+/g, '');
}

// Похожи ли два ключа: короче 4 символов — не сравниваются, порог 1 / 2 по длине короткого
export function similarKeys(a: string, b: string): boolean {
  const lengthA = [ ...a ].length;
  const lengthB = [ ...b ].length;
  const shorter = Math.min(lengthA, lengthB);

  if(shorter < MIN_KEY_LENGTH){
    return false;
  }

  const limit = shorter < LONG_KEY_LENGTH ? 1 : 2;

  if(Math.abs(lengthA - lengthB) > limit){
    return false;
  }

  return levenshtein(a, b) <= limit;
}

/*
  id рубрики → на какую она похожа. Цель в паре — больше постов, при равенстве — старше (меньший
  id). Если похожих несколько — одна, с бо́льшим числом постов. Рубрик без пометки в Map нет
*/
export function findSimilarTags<T extends SimilarTag>(tags: T[]): Map<number, T> {
  const keys = tags.map(tag => tagSimilarityKey(tag.name));
  const result = new Map<number, T>();

  for(let i = 0; i < tags.length; i++){
    for(let j = i + 1; j < tags.length; j++){
      if(!similarKeys(keys[i], keys[j])){
        continue;
      }

      const [ target, marked ] = isPreferred(tags[i], tags[j]) ? [ tags[i], tags[j] ] : [ tags[j], tags[i] ];
      const current = result.get(marked.id);

      if(!current || isPreferred(target, current)){
        result.set(marked.id, target);
      }
    }
  }

  return result;
}

const MIN_KEY_LENGTH = 4;
const LONG_KEY_LENGTH = 7;

type SimilarTag = { id: number, name: string, postsCount: number };

function isPreferred(a: SimilarTag, b: SimilarTag): boolean {
  return a.postsCount !== b.postsCount ? a.postsCount > b.postsCount : a.id < b.id;
}
