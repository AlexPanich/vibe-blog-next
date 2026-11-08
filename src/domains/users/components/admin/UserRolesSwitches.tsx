'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { USER_ROLES, type Role } from "@/database/schema";
import { UserRolesFormResource } from "@/domains/users/dto/userResources";
import { updateUserRolesAction } from "@/domains/users/actions/userAdminActions";
import { Switch } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type UserRolesSwitchesProps<T extends UserRolesFormResource> = {
  user: StrictResource<T, UserRolesFormResource>
}

/*
  Роли переключателями (спека 42, шаг 19): щелчок сразу сохраняет, кнопки нет. Переключатель
  встаёт в новое положение сразу, при ошибке возвращается. expected — роли на момент открытия
  страницы, по ним сервер узнаёт, что другой admin успел их поменять. Пока запрос идёт,
  остальные переключатели заблокированы: второй щелчок ушёл бы с устаревшим expected
*/
export default function UserRolesSwitches<T extends UserRolesFormResource>({ user }: UserRolesSwitchesProps<T>) {
  const [ roles, setRoles ] = useState(user.roles);
  const action = useAction(updateUserRolesAction.bind(null, user.id), {
    onError: () => setRoles(user.roles)
  });
  const serverError = action.result.serverError?.message;

  const toggle = (role: Role, on: boolean) => {
    const next = USER_ROLES.filter(r => r === role ? on : roles.includes(r));

    setRoles(next);
    action.execute({ roles: next, expected: user.roles });
  };

  return (
    <div className="ui-user-roles">
      { USER_ROLES.map(role => (
        <Switch
          key={role}
          className="ui-user-roles__row"
          labelPosition="left"
          size="md"
          color={ROLES[role].color}
          label={ROLES[role].label}
          description={ROLES[role].hint}
          checked={roles.includes(role)}
          disabled={action.isPending}
          onChange={e => toggle(role, e.currentTarget.checked)}
        />
      )) }
      { serverError && <p className="ui-user-card__error" role="alert">{ serverError }</p> }
    </div>
  );
}

const ROLES: Record<Role, { label: string, hint: string, color: string }> = {
  author: { label: 'Автор', hint: 'Пишет посты, отправляет на модерацию', color: 'mint' },
  moderator: { label: 'Модератор', hint: 'Проверяет посты, разбирает жалобы, ведёт рубрики', color: 'sun' },
  admin: { label: 'Администратор', hint: 'Управляет пользователями и заявками', color: 'plum' },
};
