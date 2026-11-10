import { AuthorsFilterDto } from "@/domains/users/dto/userRequests";

/*
  URL страницы авторов по условиям: порядок параметров фиксирован, значения по умолчанию
  не пишутся, `page=1` тоже
*/
export function authorsUrl(filter: Partial<AuthorsFilterDto>){
  const params = new URLSearchParams();

  if(filter.sort && filter.sort !== 'popular'){
    params.set('sort', filter.sort);
  }

  if(filter.q){
    params.set('q', filter.q);
  }

  if(filter.tag){
    params.set('tag', filter.tag);
  }

  if(filter.page && filter.page > 1){
    params.set('page', String(filter.page));
  }

  const query = params.toString();

  return query ? `/authors?${query}` as const : '/authors' as const;
}
