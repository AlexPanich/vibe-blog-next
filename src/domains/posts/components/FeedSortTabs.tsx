import { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import FeedFollowTab from "@/domains/posts/components/FeedFollowTab";
import Link from "@/components/general/Link";

const SORTS: { sort: PostFeedFilterDto['sort'], label: string }[] = [
  { sort: 'new', label: 'Новые' },
  { sort: 'popular', label: 'Популярные' },
  { sort: 'discussed', label: 'Обсуждаемые' },
];

/*
  Сортировка ленты — сегменты-ссылки в заголовке. Остальные условия сохраняются, загруженное число — нет.
  «Старые» и «По автору» — в списке «Сортировка» (FeedControls); «Мои подписки» — ссылка на
  «Мою ленту», в ней самой не показывается
*/
export default function FeedSortTabs({ filter }: { filter: PostFeedFilterDto }) {
  return (
    <div className="ui-segments-scroll">
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
        { !filter.follow && <FeedFollowTab /> }
      </nav>
    </div>
  );
}
