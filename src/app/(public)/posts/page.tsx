import { resource } from "@/core/resource";
import { feedAuthorsResource, postListResource } from "@/domains/posts/dto/postResources";
import { postFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { findFeedTags, loadFeed } from "@/domains/posts/shared/loadFeed";
import { feedAuthors, tagsWithCounts } from "@/domains/posts/shared/feedOptions";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import { isPlainFeed } from "@/domains/posts/shared/plainFeed";
import FeedSearch from "@/domains/posts/components/FeedSearch";
import FeedSortTabs from "@/domains/posts/components/FeedSortTabs";
import FeedControls from "@/domains/posts/components/FeedControls";
import FeedList from "@/domains/posts/components/FeedList";
import TagFilter from "@/domains/tags/exports/TagFilter";
import TagFollowButton from "@/domains/tags/exports/TagFollowButton";
import ButtonLink from "@/components/general/ButtonLink";
import { plural } from "@/core/plural";
import { db } from "@/globals/db";
import { posts as postsTable } from "@/database/schema";
import { IconMoodEmpty, IconRss } from "@tabler/icons-react";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Все истории' };

export default async function Authros({ searchParams }: PageProps<'/posts'>) {
  const parsed = postFeedFilterDto.parse(await searchParams);
  // Неизвестные слаги выкидываем сразу: и из запроса, и из ссылок фильтра
  const selectedTags = await findFeedTags(parsed.tag);
  const [ authors, tags, published ] = await Promise.all([ feedAuthors(), tagsWithCounts(), db.$count(postsTable, eq(postsTable.status, 'published')) ]);
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
      <div className="ui-feed-head">
        <div>
          <h1 className="ui-title ui-title--lg">Все истории</h1>
          <p className="ui-feed-head__sub">
            { published } { plural(published, [ 'пост', 'поста', 'постов' ]) } от { authors.length } { plural(authors.length, [ 'автора', 'авторов', 'авторов' ]) }
          </p>
        </div>
        <FeedSortTabs filter={filter} />
      </div>

      <div className="ui-feed-tools">
        <FeedSearch filter={filter} />
        <FeedControls filter={filter} authors={resource(feedAuthorsResource, authors)} />
      </div>
      <TagFilter
        tags={tags}
        selected={filter.tag}
        hrefFor={slugs => feedUrl({ ...filter, tag: slugs, limit: undefined })}
      />
      { selectedTags.length === 1 && <div className="ui-feed-tag-actions">
        <TagFollowButton tagId={selectedTags[0].id} name={selectedTags[0].name} />
        {/* <a>, не Link: route handler, мягкая навигация не нужна */}
        <a className="ui-rss-link" href={`/tags/${encodeURIComponent(selectedTags[0].slug)}/rss.xml`}><IconRss size={16} stroke={1.8} /> RSS рубрики</a>
      </div> }

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
