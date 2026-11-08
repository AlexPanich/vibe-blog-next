'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { OfficeMenuResource } from "@/components/navigation/officeMenuResource";
import { visibleGroups } from "@/components/navigation/officeMenuItems";
import OfficeMenuCount from "@/components/navigation/OfficeMenuCount";
import Link from "@/components/general/Link";

/*
  Разделы кабинета чипами на «Начале» — только на телефоне, вместо левого меню.
  «Новый пост» не нужен: он в нижней панели («Написать»)
*/
export default function OfficeSectionChips<T extends OfficeMenuResource>({ menu }: { menu: StrictResource<T, OfficeMenuResource> }) {
  const items = visibleGroups(menu.roles)
    .flatMap(group => group.items)
    .filter(item => item.href !== '/office/posts/create');

  return (
    <nav className="ui-tabs ui-desk__sections" aria-label="Разделы кабинета">
      { items.map(item => (
        <Link key={item.href} href={item.href} data-active={item.href === '/office'}>
          { item.label }
          { item.count && <OfficeMenuCount kind={item.count} counts={menu.counts} /> }
        </Link>
      )) }
    </nav>
  );
}
