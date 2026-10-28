import { db } from "@/globals/db";
import { tagFollows, userFollows } from "@/database/schema";
import { resource } from "@/core/resource";
import { feedAuthorsResource, postListResource } from "@/domains/posts/dto/postResources";
import { postFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { findFeedTags, loadFeed } from "@/domains/posts/shared/loadFeed";
import { feedAuthors, tagsWithCounts } from "@/domains/posts/shared/feedOptions";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import FeedFollowTabs from "@/domains/posts/components/FeedFollowTabs";
import FeedSearch from "@/domains/posts/components/FeedSearch";
import FeedTypeTabs from "@/domains/posts/components/FeedTypeTabs";
import FeedControls from "@/domains/posts/components/FeedControls";
import FeedList from "@/domains/posts/components/FeedList";
import TagFilter from "@/domains/tags/exports/TagFilter";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import { requireAuthUser } from "@/shared/auth";
import { count, eq } from "drizzle-orm";
import { IconMoodEmpty, IconUsersGroup } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Моя лента' };

// Лента подписок: та же лента, что /posts, но отбор — по моим авторам и рубрикам
export default async function OfficeFeed({ searchParams }: PageProps<'/office/feed'>) {
  const user = await requireAuthUser();
  const parsed = postFeedFilterDto.parse(await searchParams);
  const selectedTags = await findFeedTags(parsed.tag);
  const [ authors, tags, [ followed ], [ followedTags ] ] = await Promise.all([
    feedAuthors(),
    tagsWithCounts(),
    db.select({ n: count() }).from(userFollows).where(eq(userFollows.followerId, user.id)),
    db.select({ n: count() }).from(tagFollows).where(eq(tagFollows.userId, user.id))
  ]);
  const filter = {
    ...parsed,
    follow: parsed.follow ?? 'authors',
    tag: parsed.tag.filter(slug => selectedTags.some(t => t.slug === slug)),
    author: authors.some(a => a.id === parsed.author) ? parsed.author : undefined
  };
  const { posts, total } = await loadFeed(filter, 0, filter.limit, user.id);
  // Пусто, потому что подписок нужного вида нет, — это не «ничего не нашлось»
  const noFollows = (filter.follow !== 'tags' && followed.n === 0) || (filter.follow !== 'authors' && followedTags.n === 0);
  const noTags = filter.follow === 'tags' || (filter.follow === 'both' && followed.n > 0);

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Моя лента</h1>
        <span className="ui-kicker">Авторов: { followed.n } · рубрик: { followedTags.n }</span>
      </div>

      <FeedFollowTabs filter={filter} />
      <FeedTypeTabs filter={filter} />
      <FeedSearch filter={filter} />
      <FeedControls filter={filter} authors={resource(feedAuthorsResource, authors)} />
      <TagFilter
        tags={tags}
        selected={filter.tag}
        hrefFor={slugs => feedUrl({ ...filter, tag: slugs, limit: undefined })}
      />

      { noFollows ? (
        <EmptyState
          icon={IconUsersGroup}
          title={noTags ? 'Вы ещё не подписаны ни на одну рубрику' : 'Вы ещё ни на кого не подписаны'}
          action={<>
            <ButtonLink href="/authors" variant="default">К авторам</ButtonLink>
            <ButtonLink href="/posts" variant="default">В ленту</ButtonLink>
          </>}
        >
          { noTags
            ? 'Выберите рубрику в ленте — под фильтром появится кнопка подписки.'
            : 'Подписаться можно на странице автора или поста — сюда соберутся их новые посты.' }
        </EmptyState>
      ) : total === 0 ? (
        <div className="ui-empty">
          <IconMoodEmpty size={26} stroke={1.6} />
          <p>Ничего не нашлось.</p>
          <ButtonLink href={feedUrl({ follow: filter.follow })} variant="default">Сбросить условия</ButtonLink>
        </div>
      ) : (
        <FeedList
          key={feedUrl({ ...filter, limit: undefined })}
          initial={resource(postListResource, posts)}
          total={total}
          filter={filter}
        />
      ) }
    </>
  );
}
