import type { Role } from "@/database/schema";
import { IconPencil, IconShieldCheck } from "@tabler/icons-react";

type UserRoleBadgeProps = {
  roles: Role[],
  className: string,
  // Только модератор и администратор: в списке авторов «Автор» у всех, метка лишняя
  staffOnly?: boolean,
  // Размер иконки; false — без иконки
  icon?: number | false
}

/*
  Метка старшей роли рядом с именем (спека 30): профиль, страница авторов. У читателя — ничего.
  Цвет задаёт место (className)
*/
export default function UserRoleBadge({ roles, className, staffOnly = false, icon = 13 }: UserRoleBadgeProps) {
  const role = roleBadge(roles, staffOnly);

  if(!role){
    return null;
  }

  return <span className={className} data-role={role.kind}>
    { icon !== false && <role.Icon size={icon} stroke={2} /> }{ role.label }
  </span>;
}

function roleBadge(roles: Role[], staffOnly: boolean){
  if(roles.includes('admin') || roles.includes('moderator')){
    return { kind: 'staff', label: roles.includes('admin') ? 'Администратор' : 'Модератор', Icon: IconShieldCheck };
  }
  else if(roles.includes('author') && !staffOnly){
    return { kind: 'author', label: 'Автор', Icon: IconPencil };
  }

  return null;
}
