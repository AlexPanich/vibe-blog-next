import { requireAuthUser } from "@/shared/auth";
import { POST_STATUSES, type PostStatus } from "@/database/schema";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import Link from "@/components/general/Link";
import Pager from "@/components/general/Pager";
import OfficeHead from "@/components/layout/OfficeHead";
import OfficeFab from "@/components/navigation/OfficeFab";
import PostRow from "@/domains/posts/components/PostRow";
import MyPostsSearch from "@/domains/posts/components/MyPostsSearch";
import PostStatusMoreTab from "@/domains/posts/components/PostStatusMoreTab";
import { myPostsFilterDto } from "@/domains/posts/dto/postOfficeRequests";
import { loadMyPosts } from "@/domains/posts/shared/loadMyPosts";
import { myPostsUrl } from "@/domains/posts/shared/myPostsUrl";
import { POST_STATUS_TAB_LABELS } from "@/domains/posts/shared/postStatuses";
import { pickTags } from "@/domains/posts/shared/postTags";
import { plural } from "@/core/plural";
import { IconChessKnight, IconPencilPlus, IconSearch } from "@tabler/icons-react";
import { createPost } from "@/domains/posts/policy";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Мои посты' };

/*
  «Мои посты» (спека 42, шаг 3): вкладки по статусам с числами (?status=), поиск по
  заголовку (?q=), строки постов и пагинация (?page=)
*/
export default async function OfficePosts({ searchParams }: PageProps<'/office/posts'>) {
  const user = await requireAuthUser();
  const canCreate = createPost(user);
  const filter = myPostsFilterDto.parse(await searchParams);
  const { rows, all, found, foundTotal, page, pages } = await loadMyPosts(user.id, filter);
  const hasPosts = Object.keys(all).length > 0;
  // Вкладка без постов скрыта, но выбранная остаётся — иначе поиск «потеряет» её
  const tabs = POST_STATUSES.filter(status => (found[status] ?? 0) > 0 || status === filter.status);
  // Как в макете — четыре вкладки; редкие статусы уходят в «Ещё ▾»
  const mainTabs = tabs.filter(status => MAIN_TABS.includes(status));
  const moreTabs = tabs.filter(status => !MAIN_TABS.includes(status));

  return (
    <>
      <OfficeHead
        title="Мои посты"
        sub={hasPosts ? summary(all) : undefined}
        action={canCreate && <ButtonLink href="/office/posts/create" size="md" leftSection={<IconPencilPlus size={16} />}>
          Новый пост
        </ButtonLink>}
      />

      {/* Подсказка живёт, пока постов нет, — без флага «уже показывали» (спека 27) */}
      { !hasPosts ? (canCreate ? (
        <EmptyState
          icon={IconChessKnight}
          title="Начните с первого поста"
          action={<ButtonLink href="/office/posts/create" leftSection={<IconPencilPlus size={16} />}>Написать первый пост</ButtonLink>}
        >
          Пост уходит на проверку модератору — читатели увидят его после публикации. Пока пост
          в черновике, его видите только вы.
        </EmptyState>
      ) : (
        <EmptyState
          icon={IconChessKnight}
          title="Постов нет"
          action={<ButtonLink href="/office/author-request" variant="default">Заявка в авторы</ButtonLink>}
        >
          Писать посты могут авторы — роль выдаёт администратор по заявке.
        </EmptyState>
      )) : (
        <>
          <div className="ui-filter-bar">
            <nav className="ui-tabs" aria-label="Статус поста">
              <Link href={myPostsUrl({ q: filter.q })} data-active={!filter.status}>
                Все <span className="ui-tabs__count">{ foundTotal }</span>
              </Link>
              { mainTabs.map(status => (
                <Link key={status} href={myPostsUrl({ status, q: filter.q })} data-active={status === filter.status}>
                  { POST_STATUS_TAB_LABELS[status] } <span className="ui-tabs__count">{ found[status] ?? 0 }</span>
                </Link>
              )) }
              { moreTabs.length > 0 && <PostStatusMoreTab
                items={moreTabs.map(status => ({ status, href: myPostsUrl({ status, q: filter.q }), count: found[status] ?? 0 }))}
                active={filter.status}
              /> }
            </nav>
            <MyPostsSearch filter={filter} />
          </div>

          { rows.length === 0 ? (
            <div className="ui-empty">
              <IconSearch size={26} stroke={1.6} />
              { filter.q
                ? <p>По запросу «{ filter.q }» постов нет. <Link href={myPostsUrl({ status: filter.status })}>Сбросить поиск</Link></p>
                : <p>Постов в этом статусе нет. <Link href="/office/posts">Все посты</Link></p> }
            </div>
          ) : (
            <div className="ui-rows">
              { rows.map(post => <PostRow
                key={post.id}
                post={post}
                href={`/office/posts/${post.id}`}
                tags={pickTags(post)}
                views={post.views}
                editable
              />) }
            </div>
          ) }

          <Pager page={page} pages={pages} href={n => myPostsUrl({ ...filter, page: n })} />
        </>
      ) }

      { canCreate && <OfficeFab href="/office/posts/create" label="Новый пост" icon={IconPencilPlus} /> }
    </>
  );
}

const MAIN_TABS: PostStatus[] = [ 'draft', 'moderating', 'published' ];

// «12 постов · 9 опубликовано, 1 на проверке, 2 черновика» — только ненулевые статусы
function summary(counts: Partial<Record<PostStatus, number>>){
  const n = (status: PostStatus) => counts[status] ?? 0;
  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
  const parts = [
    n('published') > 0 && `${n('published')} опубликовано`,
    n('moderating') > 0 && `${n('moderating')} на проверке`,
    n('draft') > 0 && `${n('draft')} ${plural(n('draft'), [ 'черновик', 'черновика', 'черновиков' ])}`,
  ].filter(Boolean);
  const head = `${total} ${plural(total, [ 'пост', 'поста', 'постов' ])}`;

  return parts.length > 0 ? `${head} · ${parts.join(', ')}` : head;
}
