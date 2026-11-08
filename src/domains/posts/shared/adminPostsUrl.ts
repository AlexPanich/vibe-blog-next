import type { PostAdminFilterDto } from "@/domains/posts/dto/postAdminRequests";

/*
  URL «Всех постов» в админке: порядок параметров фиксирован, первая страница не пишется
*/
export function adminPostsUrl(filter: Partial<PostAdminFilterDto>){
  const params = new URLSearchParams();

  if(filter.status){
    params.set('status', filter.status);
  }

  if(filter.page && filter.page > 1){
    params.set('page', String(filter.page));
  }

  const query = params.toString();

  return query ? `/office/admin/posts?${query}` as const : '/office/admin/posts' as const;
}
