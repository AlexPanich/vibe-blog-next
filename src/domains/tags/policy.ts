import { AuthUser } from "@/shared/authUser";

/*
  Справочник рубрик — функция раздела «Модерация»: admin там имеет все права модератора
*/
export function manageTags(user: AuthUser){
  return user.roles.includes('moderator') || user.roles.includes('admin');
}
