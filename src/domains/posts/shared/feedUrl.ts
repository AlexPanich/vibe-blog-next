import { FEED_PAGE, PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";

/*
  URL ленты по условиям: порядок параметров фиксирован, значения по умолчанию не пишутся.
  С follow — «Моя лента» в кабинете, режим authors там по умолчанию
*/
export function feedUrl(filter: Partial<PostFeedFilterDto>){
  const params = new URLSearchParams();

  if(filter.follow && filter.follow !== 'authors'){
    params.set('follow', filter.follow);
  }

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

  if(filter.period){
    params.set('period', filter.period);
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
