import { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import { POST_TYPE_TABS } from "@/domains/posts/shared/postTypes";
import Link from "next/link";

// Вкладки типов над лентой. Остальные условия сохраняются, загруженное число — нет.
export default function FeedTypeTabs({ filter }: { filter: PostFeedFilterDto }) {
  return (
    <nav className="ui-filter ui-feed-types" aria-label="Тип поста">
      { POST_TYPE_TABS.map(({ type, label }) => (
        <Link key={label} href={feedUrl({ ...filter, type, limit: undefined })} data-active={filter.type === type}>
          { label }
        </Link>
      )) }
    </nav>
  );
}
