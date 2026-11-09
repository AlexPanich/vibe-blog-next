'use client'

import 'client-only';
import type { Route } from "next";
import Link from "@/components/general/Link";
import { isActivePath } from "@/components/navigation/isActivePath";
import { SITE_PAGES } from "@/domains/site-pages/exports/sitePages";
import { usePathname } from "next/navigation";

// На главную ведёт логотип, поэтому отдельного пункта «Главная» нет.
const items: { label: string, href: Route, active?: string[] }[] = [
  { label: 'Посты', href: '/posts' },
  { label: 'Авторы', href: '/authors' },
  { label: 'Рубрики', href: '/tags' },
  // Раздел «О блоге» — четыре страницы в корне, общего префикса у них нет
  { label: 'О блоге', href: '/about', active: SITE_PAGES.map(page => page.href) },
];

export default function TopMenu() {
  const pathname = usePathname();

  return (
    <nav className="ui-nav" aria-label="Разделы">
      { items.map(item => (
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
