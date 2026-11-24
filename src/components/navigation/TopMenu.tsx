'use client'

import 'client-only';
import type { Route } from "next";
import type { StrictResource } from "@/core/resource";
import Link from "@/components/general/Link";
import { isActivePath } from "@/components/navigation/isActivePath";
import { SITE_PAGES } from "@/domains/site-pages/exports/sitePages";
import { usePathname } from "next/navigation";

// На главную ведёт логотип, поэтому отдельного пункта «Главная» нет.
const items: { label: string, href: Route, active?: string[] }[] = [
  { label: 'Посты', href: '/posts' },
  { label: 'Авторы', href: '/authors' },
  { label: 'Рубрики', href: '/tags' },
  // «Спросить блог» (спека 57) — только если ИИ включён, см. ask
  { label: 'Спросить', href: '/ask' },
  // Раздел «О блоге» — четыре страницы в корне, общего префикса у них нет
  { label: 'О блоге', href: '/about', active: SITE_PAGES.map(page => page.href) },
];

type TopMenuProps = {
  // Есть ли страница /ask: флаг считает сервер, globals/ai сюда не импортировать
  ask: StrictResource<boolean, boolean>
}

export default function TopMenu({ ask }: TopMenuProps) {
  const pathname = usePathname();
  const shown = ask ? items : items.filter(item => item.href !== '/ask');

  return (
    <nav className="ui-nav" aria-label="Разделы">
      { shown.map(item => (
        <Link
          key={item.href}
          href={item.href}
          data-active={item.active ? item.active.includes(pathname as Route) : isActivePath(pathname, item.href)}
        >
          { item.label }
        </Link>
      )) }
    </nav>
  );
}
