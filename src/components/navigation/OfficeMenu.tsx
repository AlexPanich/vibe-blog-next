'use client'

import 'client-only';
import type { Role } from "@/database/schema";
import { StrictResource } from "@/core/resource";
import { OfficeMenuResource } from "@/components/navigation/officeMenuResource";
import { activeMenuItem, visibleGroups } from "@/components/navigation/officeMenuItems";
import OfficeMenuCount from "@/components/navigation/OfficeMenuCount";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { IconArrowRight } from "@tabler/icons-react";
import Link from "@/components/general/Link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

const ROLE_LABELS: Record<Role, string> = { author: 'автор', moderator: 'модератор', admin: 'администратор' };

/*
  Левое меню кабинета (спека 42): карточка пользователя, группы пунктов, бейджи.
  На телефоне спрятано CSS — там чипы разделов на «Начале» и ссылка «‹ Кабинет»
*/
export default function OfficeMenu<T extends OfficeMenuResource>({ menu }: { menu: StrictResource<T, OfficeMenuResource> }) {
  const active = activeMenuItem(usePathname());

  return (
    <nav className="ui-desk__side" aria-label="Кабинет">
      <div className="ui-desk__me">
        <div className="ui-desk__me-top">
          <UserAvatar name={menu.name} avatarKey={menu.avatarKey} size={52} />
          <div className="ui-desk__me-text">
            <span className="ui-desk__me-name">{ menu.name }</span>
            <span className="ui-desk__me-roles">{ rolesLine(menu.roles) }</span>
          </div>
        </div>
        { menu.roles.includes('author') && <Link href={`/authors/${menu.id}`} className="ui-desk__me-link">
          Моя страница автора<IconArrowRight size={15} stroke={2} />
        </Link> }
      </div>

      { visibleGroups(menu.roles).map(group => (
        <Fragment key={group.label}>
          <p className="ui-desk__label">{ group.label }</p>
          { group.items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="ui-desk__link"
              data-active={item.href === active?.href}
            >
              <item.icon size={18} stroke={1.7} />
              { item.label }
              { item.count && <OfficeMenuCount kind={item.count} counts={menu.counts} /> }
            </Link>
          )) }
        </Fragment>
      )) }
    </nav>
  );
}

// «Автор · модератор»; без ролей — «Читатель»
function rolesLine(roles: Role[]){
  const line = roles.length > 0 ? roles.map(role => ROLE_LABELS[role]).join(' · ') : 'читатель';

  return line.charAt(0).toUpperCase() + line.slice(1);
}
