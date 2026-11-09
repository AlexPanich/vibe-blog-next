import { FEED_PAGE, PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { feedPeriodParam } from "@/domains/posts/shared/feedPeriod";

/*
  URL ленты по условиям: порядок параметров фиксирован, значения по умолчанию не пишутся.
  Период по умолчанию зависит от сортировки (shared/feedPeriod.ts).
  С follow — «Моя лента» в кабинете
*/
export function feedUrl(filter: Partial<PostFeedFilterDto>){
  const params = new URLSearchParams();

  if(filter.search){
    params.set('search', filter.search);
  }

  if(filter.type){
    params.set('type', filter.type);
  }

  if(filter.sort && filter.sort !== 'new'){
    params.set('sort', filter.sort);
  }

  if(filter.author){
    params.set('author', String(filter.author));
  }

  const period = feedPeriodParam(filter);

  if(period){
    params.set('period', period);
  }

  for(const slug of filter.tag ?? []){
    params.append('tag', slug);
  }

  if(filter.limit && filter.limit > FEED_PAGE){
    params.set('limit', String(filter.limit));
  }

  const query = params.toString();

  if(filter.follow){
    return query ? `/office/feed?${query}` as const : '/office/feed' as const;
  }

  return query ? `/posts?${query}` as const : '/posts' as const;
}

// Адрес формы поиска — та же лента без условий
export function feedPath(filter: Partial<PostFeedFilterDto>){
  return filter.follow ? '/office/feed' : '/posts';
}
