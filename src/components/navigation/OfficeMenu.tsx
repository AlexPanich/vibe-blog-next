'use client'

import 'client-only';
import type { Role } from "@/database/schema";
import { StrictResource } from "@/core/resource";
import { OfficeMenuResource } from "@/components/navigation/officeMenuResource";
import MessagesMenuCount from "@/domains/messages/exports/MessagesMenuCount";
import { IconArticle, IconBookmark, IconChecklist, IconFiles, IconFlag, IconHome, IconMessage, IconMessages, IconNews, IconPencilPlus, IconTags, IconUserCheck, IconUserCircle, IconUsers, IconUsersGroup, type Icon } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

// roles — пункт виден, если у пользователя есть хотя бы одна из ролей; count — бейдж из menu.counts;
// exact — активен только на своём url (у «Начала» под /office лежит весь кабинет)
type MenuItem = { label: string, href: Route, icon: Icon, roles?: Role[], count?: keyof OfficeMenuResource['counts'], exact?: boolean }

const groups: { label: string, items: MenuItem[] }[] = [
  {
    label: 'Кабинет',
    items: [
      { label: 'Начало', href: '/office', icon: IconHome, exact: true },
      { label: 'Мои посты', href: '/office/posts', icon: IconArticle, roles: [ 'author' ] },
      { label: 'Новый пост', href: '/office/posts/create', icon: IconPencilPlus, roles: [ 'author' ] },
      { label: 'Сообщения', href: '/office/messages', icon: IconMessages, count: 'messages' },
      { label: 'Моя лента', href: '/office/feed', icon: IconNews },
      { label: 'Подписки', href: '/office/follows', icon: IconUsersGroup },
      { label: 'Избранное', href: '/office/favorites', icon: IconBookmark },
      { label: 'Комментарии', href: '/office/comments', icon: IconMessage },
    ]
  },
  {
    label: 'Модерация',
    items: [
      { label: 'Очередь', href: '/office/moderation/posts', icon: IconChecklist, roles: [ 'moderator', 'admin' ] },
      { label: 'Жалобы', href: '/office/moderation/comments', icon: IconFlag, roles: [ 'moderator', 'admin' ], count: 'reports' },
      { label: 'Рубрики', href: '/office/moderation/tags', icon: IconTags, roles: [ 'moderator', 'admin' ] },
    ]
  },
  {
    label: 'Администрирование',
    items: [
      { label: 'Все посты', href: '/office/admin/posts', icon: IconFiles, roles: [ 'admin' ] },
      { label: 'Пользователи', href: '/office/admin/users', icon: IconUsers, roles: [ 'admin' ] },
      { label: 'Заявки', href: '/office/admin/author-requests', icon: IconUserCheck, roles: [ 'admin' ], count: 'authorRequests' },
    ]
  },
  {
    label: 'Аккаунт',
    items: [
      { label: 'Профиль', href: '/office/profile', icon: IconUserCircle },
    ]
  },
];

const allItems = groups.flatMap(group => group.items);

// Левое меню кабинета. Активен самый длинный пункт, под который подходит url:
// на /office/posts/5 горит «Мои посты», на /office/posts/create — «Новый пост».
export default function OfficeMenu<T extends OfficeMenuResource>({ menu }: { menu: StrictResource<T, OfficeMenuResource> }) {
  const active = activeHref(usePathname());
  const visible = groups
    .map(group => ({ ...group, items: group.items.filter(item => allowed(item, menu.roles)) }))
    .filter(group => group.items.length > 0);

  return (
    <nav className="ui-desk__side">
      { visible.map(group => (
        <Fragment key={group.label}>
          <p className="ui-desk__label">{ group.label }</p>
          { group.items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="ui-desk__link"
              data-active={item.href === active}
            >
              <item.icon size={18} stroke={1.7} />
              { item.label }
              { item.count === 'messages'
                ? <MessagesMenuCount initial={menu.counts.messages} />
                : item.count && menu.counts[item.count] > 0 && <span className="ui-desk__count">{ menu.counts[item.count] }</span> }
            </Link>
          )) }
        </Fragment>
      )) }
    </nav>
  );
}

function activeHref(pathname: string): string | null {
  let best: string | null = null;

  for(const { href, exact } of allItems){
    const matches = pathname === href || (!exact && pathname.startsWith(`${href}/`));

    if(matches && (best === null || href.length > best.length)){
      best = href;
    }
  }

  return best;
}

function allowed(item: MenuItem, roles: Role[]) {
  return !item.roles || item.roles.some(role => roles.includes(role));
}
