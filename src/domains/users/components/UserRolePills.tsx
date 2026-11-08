import { USER_ROLES, type Role } from "@/database/schema";
import { IconBan } from "@tabler/icons-react";

type UserRolePillsProps = {
  roles: Role[],
  banned: boolean
}

/*
  Роли маленькими пилюлями в списке пользователей админки (спека 42, шаг 18). У
  заблокированного вместо ролей — «Заблокирован», без ролей — «Читатель», как в макете.
  Цвета — как в профиле (ProfileRoles): автор мятный, модератор жёлтый, админ фиолетовый
*/
export default function UserRolePills({ roles, banned }: UserRolePillsProps) {
  if(banned){
    return (
      <span className="ui-role-pills">
        <span className="ui-role-pill" data-role="banned"><IconBan size={12} stroke={2.2} />Заблокирован</span>
      </span>
    );
  }

  const given = USER_ROLES.filter(role => roles.includes(role));

  return (
    <span className="ui-role-pills">
      { given.length === 0
        ? <span className="ui-role-pill" data-role="reader">Читатель</span>
        : given.map(role => <span key={role} className="ui-role-pill" data-role={role}>{ ROLE_LABELS[role] }</span>) }
    </span>
  );
}

const ROLE_LABELS: Record<Role, string> = { author: 'Автор', moderator: 'Модератор', admin: 'Админ' };
