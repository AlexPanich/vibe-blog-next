import { USER_ROLES, type Role } from "@/database/schema";

// Роли пилюлями: «Читатель» есть у всех, дальше — выданные администратором.
export default function ProfileRoles({ roles }: { roles: Role[] }) {
  return (
    <ul className="ui-account-roles">
      <li data-role="reader">Читатель</li>
      { USER_ROLES.filter(role => roles.includes(role)).map(role => (
        <li key={role} data-role={role}>{ ROLE_LABELS[role] }</li>
      )) }
    </ul>
  );
}

const ROLE_LABELS: Record<Role, string> = { author: 'Автор', moderator: 'Модератор', admin: 'Администратор' };
