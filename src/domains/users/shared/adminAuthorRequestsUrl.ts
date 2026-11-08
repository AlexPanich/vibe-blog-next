import type { AuthorRequestAdminFilterDto } from "@/domains/users/dto/authorRequestRequests";

/*
  URL «Заявок в авторы» в админке: вкладка «Ожидают» и первая страница не пишутся
*/
export function adminAuthorRequestsUrl(filter: Partial<AuthorRequestAdminFilterDto>){
  const params = new URLSearchParams();

  if(filter.tab === 'decided'){
    params.set('tab', 'decided');
  }

  if(filter.tab === 'decided' && filter.page && filter.page > 1){
    params.set('page', String(filter.page));
  }

  const query = params.toString();

  return query ? `/office/admin/author-requests?${query}` as const : '/office/admin/author-requests' as const;
}
