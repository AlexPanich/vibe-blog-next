import type { MyPostsFilterDto } from "@/domains/posts/dto/postOfficeRequests";

/*
  URL «Моих постов» по условиям: порядок параметров фиксирован, первая страница не пишется
*/
export function myPostsUrl(filter: Partial<MyPostsFilterDto>){
  const params = new URLSearchParams();

  if(filter.status){
    params.set('status', filter.status);
  }

  if(filter.q){
    params.set('q', filter.q);
  }

  if(filter.page && filter.page > 1){
    params.set('page', String(filter.page));
  }

  const query = params.toString();

  return query ? `/office/posts?${query}` as const : '/office/posts' as const;
}
