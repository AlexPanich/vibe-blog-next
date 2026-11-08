'use client'

import 'client-only';
import type { Route } from "next";
import Link from "@/components/general/Link";
import { isActivePath } from "@/components/navigation/isActivePath";
import useUser from "@/hooks/useUser";
import { createPost } from "@/domains/posts/exports/postPolicy";
import { IconBell, IconHome, IconNews, IconPencilPlus, IconUserCircle, type Icon } from "@tabler/icons-react";
import { usePathname } from "next/navigation";

/*
  Нижняя панель на телефоне (спеки 30, 42) — в публичной части и в кабинете. На широком
  экране спрятана CSS. Кабинетные пункты гостю ведут туда же: proxy и layout кабинета
  уводят на вход. «Написать» не-автору открывает заявку в авторы — создать пост он не может.
  Горит самый длинный подходящий пункт: «Кабинет» — на всём /office, кроме уведомлений и
  нового поста, у которых своя вкладка
*/
export default function MobileTabBar() {
  const pathname = usePathname();
  const { user, ready } = useUser();
  const canWrite = ready && user !== null && createPost(user);

  const items: { label: string, href: Route, icon: Icon }[] = [
    { label: 'Главная', href: '/', icon: IconHome },
    { label: 'Лента', href: '/posts', icon: IconNews },
    { label: 'Написать', href: canWrite ? '/office/posts/create' : '/office/author-request', icon: IconPencilPlus },
    { label: 'Уведомл.', href: '/office/notifications', icon: IconBell },
    { label: 'Кабинет', href: '/office', icon: IconUserCircle },
  ];
  const active = items
    .filter(item => isActivePath(pathname, item.href))
    .reduce<string | null>((best, item) => best === null || item.href.length > best.length ? item.href : best, null);

  return (
    <nav className="ui-tabbar" aria-label="Быстрые разделы">
      { items.map(({ label, href, icon: ItemIcon }) => (
        <Link
          key={label}
          href={href}
          className="ui-tabbar__item"
          data-active={href === active}
        >
          <ItemIcon size={22} stroke={1.8} aria-hidden />
          <span>{ label }</span>
        </Link>
      )) }
    </nav>
  );
}
