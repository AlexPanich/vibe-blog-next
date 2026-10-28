import { FeedFollow, PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import Link from "@/components/general/Link";

const TABS: { follow: FeedFollow, label: string }[] = [
  { follow: 'authors', label: 'Авторы' },
  { follow: 'tags', label: 'Рубрики' },
  { follow: 'both', label: 'Авторы и рубрики' },
];

// Режим «Моей ленты». Остальные условия сохраняются, загруженное число — нет.
export default function FeedFollowTabs({ filter }: { filter: PostFeedFilterDto }) {
  return (
    <nav className="ui-filter" aria-label="Чьи посты">
      { TABS.map(({ follow, label }) => (
        <Link key={follow} href={feedUrl({ ...filter, follow, limit: undefined })} data-active={filter.follow === follow}>
          { label }
        </Link>
      )) }
    </nav>
  );
}
