'use client'

import 'client-only';
import type { Route } from "next";
import Link from "@/components/general/Link";
import { isActivePath } from "@/components/navigation/isActivePath";
import { usePathname } from "next/navigation";

// На главную ведёт логотип, поэтому отдельного пункта «Главная» нет.
const items: { label: string, href: Route }[] = [
  { label: 'Посты', href: '/posts' },
  { label: 'Авторы', href: '/authors' },
];

export default function TopMenu() {
  const pathname = usePathname();

  return (
    <nav className="ui-nav" aria-label="Разделы">
      { items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          data-active={isActivePath(pathname, item.href)}
        >
          { item.label }
        </Link>
      )) }
    </nav>
  );
}
