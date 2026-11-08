import Link from "@/components/general/Link";
import type { MyPostsFilterDto } from "@/domains/posts/dto/postOfficeRequests";
import { myPostsUrl } from "@/domains/posts/shared/myPostsUrl";
import { IconSearch, IconX } from "@tabler/icons-react";

/*
  Поиск по заголовкам своих постов обычной GET-формой: работает без JS, вкладка статуса
  едет скрытым полем, страница сбрасывается
*/
export default function MyPostsSearch({ filter }: { filter: MyPostsFilterDto }) {
  return (
    <form action="/office/posts" method="get" className="ui-search ui-filter-bar__search" role="search">
      <IconSearch size={16} stroke={1.7} className="ui-search__icon" />
      <input
        type="search"
        name="q"
        defaultValue={filter.q ?? ''}
        placeholder="Найти среди своих постов"
        aria-label="Поиск по заголовкам своих постов"
        className="ui-search__input"
      />
      { filter.status && <input type="hidden" name="status" value={filter.status} /> }
      { filter.q && <Link href={myPostsUrl({ status: filter.status })} className="ui-search__clear" aria-label="Сбросить поиск">
        <IconX size={16} />
      </Link> }
    </form>
  );
}
