import { User } from "@/database/types";
import { AuthUser } from "@/shared/authUser";

export function manageUsers(user: AuthUser){
  return user.roles.includes('admin');
}

/*
  Свои роли и свой бан менять нельзя: так действующий admin всегда остаётся admin,
  и система не останется без админов
*/
export function manageUser(user: AuthUser, target: Pick<User, 'id'>){
  return manageUsers(user) && user.id !== target.id;
}

/*
  Блокировка (спека 26): не себя и не staff — staff должен видеть и решать всё. Сам staff
  блокировать может, на модерацию это не влияет
*/
export function blockUser(user: Pick<AuthUser, 'id'>, target: { id: number, staff: boolean }){
  return user.id !== target.id && !target.staff;
}
