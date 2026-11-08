'use client'

import 'client-only';
import { activeMenuItem } from "@/components/navigation/officeMenuItems";
import { IconChevronLeft } from "@tabler/icons-react";
import Link from "@/components/general/Link";
import { usePathname } from "next/navigation";

/*
  Телефон (спека 42): левого меню нет, со страницы раздела — «‹ Кабинет» (или «‹ Мои посты»
  с нового поста). На «Начале» вместо неё чипы разделов, на вложенных страницах (пост,
  диалог, пользователь) своя ссылка назад — там эта не нужна. На десктопе спрятана CSS.
  Разделы без пункта в меню (заявка в авторы) — тоже «‹ Кабинет»
*/
export default function OfficeBackLink() {
  const pathname = usePathname();
  const item = OUTSIDE_MENU.includes(pathname) ? { href: pathname, parent: undefined } : activeMenuItem(pathname);

  if(!item || item.href !== pathname || item.href === '/office'){
    return null;
  }

  const parent = item.parent ?? { label: 'Кабинет', href: '/office' as const };

  return (
    <Link href={parent.href} className="ui-backlink ui-desk__back">
      <IconChevronLeft size={16} stroke={2} />{ parent.label }
    </Link>
  );
}

const OUTSIDE_MENU = [ '/office/author-request' ];
