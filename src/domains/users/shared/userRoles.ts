import { Role, USER_ROLES } from "@/database/schema";

/*
  Роли в каноническом порядке USER_ROLES, без повторов. better-auth хранит их JSON-строкой,
  и условный UPDATE сравнивает строки — обе стороны сериализуются через эту функцию
*/
export function serializeRoles(roles: readonly Role[]){
  return JSON.stringify(USER_ROLES.filter(role => roles.includes(role)));
}

export function parseRoles(value: string): Role[] {
  const parsed: unknown = JSON.parse(value);

  return USER_ROLES.filter(role => Array.isArray(parsed) && parsed.includes(role));
}
