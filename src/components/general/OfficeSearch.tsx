import Link from "@/components/general/Link";
import { IconSearch, IconX } from "@tabler/icons-react";
import type { Route } from "next";

type OfficeSearchProps = {
  action: Route,
  q: string | undefined,
  placeholder: string,
  // aria-label поля
  label: string,
  // Состояние страницы, которое поиск сохраняет (вкладка, сортировка); undefined и '' не пишутся
  hidden?: Record<string, string | undefined>,
  // Ссылка «×» — видна, пока есть запрос
  clearHref: Route,
  // Модификатор обёртки: ui-filter-bar__search, ui-tag-bar__search, …
  className?: string,
  iconSize?: number
};

/*
  Поиск обычной GET-формой (спека 44, реш. 2): отправка по Enter, работает без JS.
  Вкладка и сортировка едут скрытыми полями, страница сбрасывается
*/
export default function OfficeSearch({ action, q, placeholder, label, hidden = {}, clearHref, className, iconSize = 16 }: OfficeSearchProps) {
  return (
    <form action={action} method="get" className={className ? `ui-search ${className}` : 'ui-search'} role="search">
      <IconSearch size={iconSize} stroke={1.7} className="ui-search__icon" />
      <input
        type="search"
        name="q"
        defaultValue={q ?? ''}
        placeholder={placeholder}
        aria-label={label}
        className="ui-search__input"
      />
      { Object.entries(hidden).map(([ name, value ]) => value
        ? <input key={name} type="hidden" name={name} value={value} />
        : null) }
      { q && <Link href={clearHref} className="ui-search__clear" aria-label="Сбросить поиск">
        <IconX size={16} />
      </Link> }
    </form>
  );
}
