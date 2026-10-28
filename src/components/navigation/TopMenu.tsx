'use client'

import 'client-only';
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items: { label: string, href: Route }[] = [
  { label: 'Главная', href: '/' },
  { label: 'Блог', href: '/posts' },
  { label: 'Авторы', href: '/authors' },
];

export default function TopMenu() {
  const pathname = usePathname();

  return (
    <nav className="ui-nav">
      { items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          data-active={isActive(pathname, item.href)}
        >
          { item.label }
        </Link>
      )) }
    </nav>
  );
}

function isActive(pathname: string, href: string) {
  if(href === '/'){
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
