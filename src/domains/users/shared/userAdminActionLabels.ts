import type { UserAdminActionType } from "@/database/schema";

/*
  Подписи журнала без рода: «Заблокирован · Alice», а не «Alice заблокировала» —
  род по имени не угадываем
*/
export const USER_ADMIN_ACTION_LABELS: Record<UserAdminActionType, string> = {
  banned: 'Заблокирован',
  unbanned: 'Разблокирован',
  role_granted: 'Выдана роль',
  role_revoked: 'Снята роль',
  avatar_removed: 'Аватар удалён',
};
