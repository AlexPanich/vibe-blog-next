import type { Route } from "next";
import Link from "@/components/general/Link";
import { IconChevronRight } from "@tabler/icons-react";
import { Fragment } from "react";

type Crumb = { label: string, href?: Route }

/*
  Хлебные крошки вложенных страниц кабинета (спека 42): редактор, ревью, карточка
  пользователя. Последняя — текущая страница, без ссылки
*/
export default function OfficeCrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="ui-crumbs" aria-label="Путь">
      { items.map((item, i) => <Fragment key={item.label}>
        { i > 0 && <IconChevronRight size={14} stroke={1.8} aria-hidden /> }
        { item.href
          ? <Link href={item.href}>{ item.label }</Link>
          : <span aria-current="page">{ item.label }</span> }
      </Fragment>) }
    </nav>
  );
}
