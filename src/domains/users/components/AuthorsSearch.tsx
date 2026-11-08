import Link from "@/components/general/Link";
import { AuthorsFilterDto } from "@/domains/users/dto/userRequests";
import { authorsUrl } from "@/domains/users/shared/authorsUrl";
import { IconSearch, IconX } from "@tabler/icons-react";

/*
  Поиск автора по имени обычной GET-формой: работает без JS. Сортировка и рубрика едут
  скрытыми полями
*/
export default function AuthorsSearch({ filter }: { filter: AuthorsFilterDto }) {
  return (
    <form action="/authors" method="get" className="ui-search ui-authors-search" role="search">
      <IconSearch size={17} stroke={1.7} className="ui-search__icon" />
      <input
        type="search"
        name="q"
        defaultValue={filter.q ?? ''}
        placeholder="Найти автора по имени"
        aria-label="Поиск автора по имени"
        className="ui-search__input"
      />
      { filter.sort !== 'popular' && <input type="hidden" name="sort" value={filter.sort} /> }
      { filter.tag && <input type="hidden" name="tag" value={filter.tag} /> }
      { filter.q && <Link href={authorsUrl({ ...filter, q: undefined })} className="ui-search__clear" aria-label="Сбросить поиск">
        <IconX size={16} />
      </Link> }
    </form>
  );
}
