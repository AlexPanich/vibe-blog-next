import Link from "@/components/general/Link";
import type { TagModerationFilterDto } from "@/domains/tags/dto/tagModerationRequests";
import { tagModerationUrl } from "@/domains/tags/shared/tagModerationUrl";
import { IconSearch, IconX } from "@tabler/icons-react";

/*
  Поиск по справочнику рубрик обычной GET-формой: работает без JS, сортировка едет
  скрытым полем
*/
export default function TagSearch({ filter }: { filter: TagModerationFilterDto }) {
  return (
    <form action="/office/moderation/tags" method="get" className="ui-search ui-tag-bar__search" role="search">
      <IconSearch size={16} stroke={1.7} className="ui-search__icon" />
      <input
        type="search"
        name="q"
        defaultValue={filter.q ?? ''}
        placeholder="Найти рубрику"
        aria-label="Поиск по названию или slug рубрики"
        className="ui-search__input"
      />
      { filter.sort !== 'posts' && <input type="hidden" name="sort" value={filter.sort} /> }
      { filter.q && <Link href={tagModerationUrl({ sort: filter.sort })} className="ui-search__clear" aria-label="Сбросить поиск">
        <IconX size={16} />
      </Link> }
    </form>
  );
}
