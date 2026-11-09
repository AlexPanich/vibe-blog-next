import type { Role } from "@/database/schema";
import type { OfficeMenuResource } from "@/components/navigation/officeMenuResource";
import { IconArticle, IconBell, IconBookmark, IconChecklist, IconFiles, IconFlag, IconHome, IconMessage, IconMessages, IconNews, IconPencilPlus, IconTags, IconUserCheck, IconUserCircle, IconUsers, IconUsersGroup, type Icon } from "@tabler/icons-react";
import type { Route } from "next";

/*
  roles — пункт виден, если у пользователя есть хотя бы одна из ролей; count — бейдж из menu.counts;
  exact — активен только на своём url (у «Начала» под /office лежит весь кабинет);
  parent — куда ведёт «‹ назад» на телефоне, если не в «Кабинет»;
  match — префикс активности, если он шире href (у «Жалоб» — оба подраздела, спека 36)
*/
export type OfficeMenuItem = {
  label: string,
  href: Route,
  icon: Icon,
  roles?: Role[],
  count?: keyof OfficeMenuResource['counts'],
  exact?: boolean,
  match?: string,
  parent?: { label: string, href: Route }
}

export const OFFICE_MENU_GROUPS: { label: string, items: OfficeMenuItem[] }[] = [
  {
    label: 'Кабинет',
    items: [
      { label: 'Начало', href: '/office', icon: IconHome, exact: true },
      { label: 'Мои посты', href: '/office/posts', icon: IconArticle, roles: [ 'author' ] },
      { label: 'Новый пост', href: '/office/posts/create', icon: IconPencilPlus, roles: [ 'author' ], parent: { label: 'Мои посты', href: '/office/posts' } },
      { label: 'Сообщения', href: '/office/messages', icon: IconMessages, count: 'messages' },
      { label: 'Уведомления', href: '/office/notifications', icon: IconBell, count: 'notifications' },
      { label: 'Моя лента', href: '/office/feed', icon: IconNews },
      { label: 'Подписки', href: '/office/follows', icon: IconUsersGroup },
      { label: 'Избранное', href: '/office/favorites', icon: IconBookmark },
      { label: 'Комментарии', href: '/office/comments', icon: IconMessage },
    ]
  },
  {
    label: 'Модерация',
    items: [
      { label: 'Очередь', href: '/office/moderation/posts', icon: IconChecklist, roles: [ 'moderator', 'admin' ], count: 'moderating' },
      { label: 'Жалобы', href: '/office/moderation/reports/posts', match: '/office/moderation/reports', icon: IconFlag, roles: [ 'moderator', 'admin' ], count: 'reports' },
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

const ALL_ITEMS = OFFICE_MENU_GROUPS.flatMap(group => group.items);

// Цвет бейджа: личное — коралл, очереди модерации — солнце, заявки в авторы — фиолетовый
export const OFFICE_COUNT_TONES: Record<keyof OfficeMenuResource['counts'], 'coral' | 'sun' | 'plum'> = {
  messages: 'coral',
  notifications: 'coral',
  moderating: 'sun',
  reports: 'sun',
  authorRequests: 'plum',
};

export function visibleGroups(roles: Role[]){
  return OFFICE_MENU_GROUPS
    .map(group => ({ ...group, items: group.items.filter(item => !item.roles || item.roles.some(role => roles.includes(role))) }))
    .filter(group => group.items.length > 0);
}

/*
  Активен самый длинный пункт, под который подходит url:
  на /office/posts/5 горит «Мои посты», на /office/posts/create — «Новый пост»
*/
export function activeMenuItem(pathname: string): OfficeMenuItem | null {
  let best: OfficeMenuItem | null = null;

  for(const item of ALL_ITEMS){
    const prefix = item.match ?? item.href;
    const matches = pathname === prefix || (!item.exact && pathname.startsWith(`${prefix}/`));

    if(matches && (best === null || prefix.length > (best.match ?? best.href).length)){
      best = item;
    }
  }

  return best;
}
