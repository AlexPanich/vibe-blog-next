import { resource } from "@/core/resource";
import { feedAuthorsResource, postListResource } from "@/domains/posts/dto/postResources";
import { postFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { findFeedTags, loadFeed } from "@/domains/posts/shared/loadFeed";
import { feedAuthors, tagsWithCounts } from "@/domains/posts/shared/feedOptions";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import { isPlainFeed } from "@/domains/posts/shared/plainFeed";
import FeedSearch from "@/domains/posts/components/FeedSearch";
import FeedTypeTabs from "@/domains/posts/components/FeedTypeTabs";
import FeedControls from "@/domains/posts/components/FeedControls";
import FeedList from "@/domains/posts/components/FeedList";
import TagFilter from "@/domains/tags/exports/TagFilter";
import TagFollowButton from "@/domains/tags/exports/TagFollowButton";
import ButtonLink from "@/components/general/ButtonLink";
import { IconMoodEmpty } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Блог' };

export default async function Authros({ searchParams }: PageProps<'/posts'>) {
  const parsed = postFeedFilterDto.parse(await searchParams);
  // Неизвестные слаги выкидываем сразу: и из запроса, и из ссылок фильтра
  const selectedTags = await findFeedTags(parsed.tag);
  const [ authors, tags ] = await Promise.all([ feedAuthors(), tagsWithCounts() ]);
  const filter = {
    ...parsed,
    // Лента подписок живёт в кабинете: здесь сессию не читаем
    follow: undefined,
    tag: parsed.tag.filter(slug => selectedTags.some(t => t.slug === slug)),
    // Несуществующий автор — как не заданный
    author: authors.some(a => a.id === parsed.author) ? parsed.author : undefined
  };
  const { posts, total } = await loadFeed(filter, 0, filter.limit);

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title ui-title--lg">Блог</h1>
        <span className="ui-kicker">Все партии на одной доске</span>
      </div>

      <FeedTypeTabs filter={filter} />
      <FeedSearch filter={filter} />
      <FeedControls filter={filter} authors={resource(feedAuthorsResource, authors)} />
      <TagFilter
        tags={tags}
        selected={filter.tag}
        hrefFor={slugs => feedUrl({ ...filter, tag: slugs, limit: undefined })}
      />
      { selectedTags.length === 1 && <TagFollowButton tagId={selectedTags[0].id} name={selectedTags[0].name} /> }

      { total === 0 ? (
        <div className="ui-empty">
          <IconMoodEmpty size={26} stroke={1.6} />
          <p>Ничего не нашлось.</p>
          <ButtonLink href="/posts" variant="default">Сбросить всё</ButtonLink>
        </div>
      ) : (
        <FeedList
          key={feedUrl({ ...filter, limit: undefined })}
          initial={resource(postListResource, posts)}
          total={total}
          filter={filter}
          live={isPlainFeed(filter)}
        />
      ) }
    </>
  );
}
