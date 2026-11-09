import { resource } from "@/core/resource";
import { plural } from "@/core/plural";
import { postListResource } from "@/domains/posts/dto/postResources";
import { postFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { findFeedTags, loadFeed } from "@/domains/posts/shared/loadFeed";
import { feedFollows } from "@/domains/posts/shared/feedOptions";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import FeedFollowChips from "@/domains/posts/components/FeedFollowChips";
import FeedSearch from "@/domains/posts/components/FeedSearch";
import FeedSortTabs from "@/domains/posts/components/FeedSortTabs";
import FeedControls from "@/domains/posts/components/FeedControls";
import FeedList from "@/domains/posts/components/FeedList";
import OfficeHead from "@/components/layout/OfficeHead";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import { requireAuthUser } from "@/shared/auth";
import { IconMoodEmpty, IconUsers, IconUsersGroup } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Моя лента' };

// Лента подписок: та же лента, что /posts, но только посты моих авторов и моих рубрик
export default async function OfficeFeed({ searchParams }: PageProps<'/office/feed'>) {
  const user = await requireAuthUser();
  const parsed = postFeedFilterDto.parse(await searchParams);
  const [ selectedTags, follows ] = await Promise.all([ findFeedTags(parsed.tag), feedFollows(user.id) ]);
  const filter = {
    ...parsed,
    follow: true,
    tag: parsed.tag.filter(slug => selectedTags.some(t => t.slug === slug)),
    // Автор — только из моих подписок: чужого в ленте подписок не выбрать
    author: follows.authors.some(a => a.id === parsed.author) ? parsed.author : undefined
  };
  const noFollows = follows.authors.length === 0 && follows.tags.length === 0;
  const { posts, total } = noFollows ? { posts: [], total: 0 } : await loadFeed(filter, 0, filter.limit, user.id);
  const manage = <ButtonLink href="/office/follows" variant="default" size="md" leftSection={<IconUsers size={16} />}>Подписки</ButtonLink>;

  if(noFollows){
    return (
      <>
        <OfficeHead title="Моя лента" action={manage} />
        <EmptyState
          icon={IconUsersGroup}
          title="Вы ещё ни на кого не подписаны"
          action={<>
            <ButtonLink href="/authors" variant="default">К авторам</ButtonLink>
            <ButtonLink href="/posts" variant="default">В ленту</ButtonLink>
          </>}
        >
          Подписаться можно на странице автора или поста, а на рубрику — выбрав её в ленте. Сюда
          соберутся их новые посты.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <OfficeHead title="Моя лента" sub={followsSummary(follows.authors.length, follows.tags.length)} action={manage} />

      <FeedFollowChips filter={filter} authors={follows.authors} tags={follows.tags} />
      <div className="ui-feed-tools ui-feed-tools--office">
        <FeedSearch filter={filter} />
        <FeedControls filter={filter} />
        <FeedSortTabs filter={filter} />
      </div>

      { total === 0 ? (
        <div className="ui-empty">
          <IconMoodEmpty size={26} stroke={1.6} />
          <p>Ничего не нашлось.</p>
          <ButtonLink href={feedUrl({ follow: true })} variant="default">Сбросить условия</ButtonLink>
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

// «Новые посты 8 авторов и 4 рубрик, на которые вы подписаны»
function followsSummary(authors: number, tags: number){
  const parts = [
    authors > 0 && `${authors} ${plural(authors, [ 'автора', 'авторов', 'авторов' ])}`,
    tags > 0 && `${tags} ${plural(tags, [ 'рубрики', 'рубрик', 'рубрик' ])}`
  ].filter(Boolean);

  return `Новые посты ${parts.join(' и ')}, на которые вы подписаны`;
}
