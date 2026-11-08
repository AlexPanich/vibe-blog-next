import { AuthorsFilterDto } from "@/domains/users/dto/userRequests";

/*
  URL страницы авторов по условиям: порядок параметров фиксирован, значения по умолчанию
  не пишутся
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

  const query = params.toString();

  return query ? `/authors?${query}` as const : '/authors' as const;
}
