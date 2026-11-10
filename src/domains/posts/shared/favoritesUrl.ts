import type { FavoriteFilterDto } from "@/domains/posts/dto/postFavoriteRequests";

/*
  URL избранного в кабинете: порядок параметров фиксирован, сортировка по умолчанию не пишется
*/
export function favoritesUrl(filter: Partial<FavoriteFilterDto>){
  const params = new URLSearchParams();

  if(filter.tag){
    params.set('tag', filter.tag);
  }

  if(filter.sort && filter.sort !== 'added'){
    params.set('sort', filter.sort);
  }

  const query = params.toString();

  return query ? `/office/favorites?${query}` as const : '/office/favorites' as const;
}
