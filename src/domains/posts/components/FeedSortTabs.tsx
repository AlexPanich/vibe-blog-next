import { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import Link from "@/components/general/Link";

const SORTS: { sort: PostFeedFilterDto['sort'], label: string }[] = [
  { sort: 'new', label: 'Новые' },
  { sort: 'rating', label: 'Лучшие' },
  { sort: 'old', label: 'Старые' },
  { sort: 'author', label: 'По автору' },
];

// Сортировка ленты — сегменты-ссылки в заголовке. Остальные условия сохраняются, загруженное число — нет.
export default function FeedSortTabs({ filter }: { filter: PostFeedFilterDto }) {
  return (
    <nav className="ui-segments" aria-label="Сортировка">
      { SORTS.map(({ sort, label }) => (
        <Link
          key={sort}
          href={feedUrl({ ...filter, sort, limit: undefined })}
          data-active={filter.sort === sort}
          aria-current={filter.sort === sort ? 'true' : undefined}
        >
          { label }
        </Link>
      )) }
    </nav>
  );
}
