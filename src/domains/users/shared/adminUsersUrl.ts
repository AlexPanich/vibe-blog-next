import type { UserAdminFilterDto } from "@/domains/users/dto/userAdminRequests";

/*
  URL «Пользователей» в админке: порядок параметров фиксирован, первая страница не пишется
*/
export function adminUsersUrl(filter: Partial<UserAdminFilterDto>){
  const params = new URLSearchParams();

  if(filter.filter){
    params.set('filter', filter.filter);
  }

  if(filter.page && filter.page > 1){
    params.set('page', String(filter.page));
  }

  const query = params.toString();

  return query ? `/office/admin/users?${query}` as const : '/office/admin/users' as const;
}
