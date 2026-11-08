import { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { feedPath, feedUrl } from "@/domains/posts/shared/feedUrl";
import Link from "@/components/general/Link";
import { IconSearch, IconX } from "@tabler/icons-react";

// Поиск обычной GET-формой: работает без JS, каждый поиск — запись в истории.
// Остальные условия едут скрытыми полями; limit — нет: новый поиск начинается с первой порции.
export default function FeedSearch({ filter }: { filter: PostFeedFilterDto }) {
  return (
    <form action={feedPath(filter)} method="get" className="ui-search" role="search">
      <IconSearch size={17} stroke={1.7} className="ui-search__icon" />
      <input
        type="search"
        name="search"
        defaultValue={filter.search ?? ''}
        placeholder={filter.follow ? 'Поиск в ленте' : 'Поиск по заголовку и тексту'}
        aria-label="Поиск по постам"
        className="ui-search__input"
      />
      { filter.type && <input type="hidden" name="type" value={filter.type} /> }
      { filter.sort !== 'new' && <input type="hidden" name="sort" value={filter.sort} /> }
      { filter.author && <input type="hidden" name="author" value={filter.author} /> }
      { filter.period && <input type="hidden" name="period" value={filter.period} /> }
      { filter.tag.map(slug => <input key={slug} type="hidden" name="tag" value={slug} />) }
      { filter.search && <Link href={feedUrl({ ...filter, search: undefined, limit: undefined })} className="ui-search__clear" aria-label="Сбросить поиск">
        <IconX size={16} />
      </Link> }
      <button type="submit" className="ui-search__submit">Найти</button>
    </form>
  );
}
