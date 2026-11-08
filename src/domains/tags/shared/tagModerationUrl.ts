import type { TagModerationFilterDto } from "@/domains/tags/dto/tagModerationRequests";

/*
  URL справочника рубрик по условиям: порядок параметров фиксирован, сортировка по
  умолчанию не пишется
*/
export function tagModerationUrl(filter: Partial<TagModerationFilterDto>){
  const params = new URLSearchParams();

  if(filter.q){
    params.set('q', filter.q);
  }

  if(filter.sort && filter.sort !== 'posts'){
    params.set('sort', filter.sort);
  }

  const query = params.toString();

  return query ? `/office/moderation/tags?${query}` as const : '/office/moderation/tags' as const;
}
