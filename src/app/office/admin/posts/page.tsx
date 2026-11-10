import { CONTAINER } from "@/globals/container";
import type { PostStatus } from "@/database/schema";
import { adminPosts } from "@/domains/posts/policy";
import PostAdminTable from "@/domains/posts/components/admin/PostAdminTable";
import PostAdminRow from "@/domains/posts/components/admin/PostAdminRow";
import PostMoreTab from "@/domains/posts/components/PostMoreTab";
import { postAdminFilterDto } from "@/domains/posts/dto/postAdminRequests";
import { loadAdminPosts } from "@/domains/posts/shared/loadAdminPosts";
import { adminPostsUrl } from "@/domains/posts/shared/adminPostsUrl";
import { POST_STATUS_TAB_LABELS } from "@/domains/posts/shared/postStatuses";
import OfficeHead from "@/components/layout/OfficeHead";
import Link from "@/components/general/Link";
import OfficeSearch from "@/components/general/OfficeSearch";
import Pager from "@/components/general/Pager";
import { plural } from "@/core/plural";
import { IconChessKnight, IconSearch } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Все посты' };

/*
  «Все посты» в админке (спека 42, шаг 17): вкладки статусов с числами (?status=), таблица
  постов всех авторов, пагинация (?page=), поиск по заголовку или автору (?q=, спека 44).
  Просмотры — спека 43
*/
export default async function AdminPosts({ searchParams }: PageProps<'/office/admin/posts'>) {
  await CONTAINER.boucerService.breakIfCant(adminPosts);

  const filter = postAdminFilterDto.parse(await searchParams);
  const { rows, counts, total, foundTotal, authors, page, pages } = await loadAdminPosts(filter);
  const year = new Date().getFullYear();

  return (
    <>
      <OfficeHead
        title="Все посты"
        sub={total > 0
          ? `${total} ${plural(total, [ 'пост', 'поста', 'постов' ])} от ${authors} ${plural(authors, [ 'автора', 'авторов', 'авторов' ])}`
          : undefined}
      />

      <div className="ui-filter-bar">
        <nav className="ui-tabs" aria-label="Статус поста">
          <Link href={adminPostsUrl({ q: filter.q })} data-active={!filter.status}>
            Все <span className="ui-tabs__count">{ foundTotal }</span>
          </Link>
          { MAIN_TABS.map(({ status, short }) => (
            <Link key={status} href={adminPostsUrl({ status, q: filter.q })} data-active={status === filter.status}>
              <span className="ui-tabs__label-full">{ POST_STATUS_TAB_LABELS[status] }</span>
              <span className="ui-tabs__label-short">{ short }</span>
              <span className="ui-tabs__count">{ counts[status] ?? 0 }</span>
            </Link>
          )) }
          <PostMoreTab
            items={MORE_TABS.map(status => ({
              key: status,
              label: POST_STATUS_TAB_LABELS[status],
              href: adminPostsUrl({ status, q: filter.q }),
              count: counts[status] ?? 0
            }))}
            active={filter.status}
          />
        </nav>
        <OfficeSearch
          action="/office/admin/posts"
          q={filter.q}
          placeholder="Найти по заголовку или автору"
          label="Поиск поста по заголовку или имени автора"
          hidden={{ status: filter.status }}
          clearHref={adminPostsUrl({ status: filter.status })}
          className="ui-filter-bar__search"
        />
      </div>

      { rows.length === 0 ? (
        filter.q ? (
          <div className="ui-empty">
            <IconSearch size={26} stroke={1.6} />
            <p>По запросу «{ filter.q }» постов нет. <Link href={adminPostsUrl({ status: filter.status })}>Сбросить поиск</Link></p>
          </div>
        ) : (
          <div className="ui-empty">
            <IconChessKnight size={26} stroke={1.6} />
            <p>{ filter.status ? 'Постов в этом статусе нет.' : 'Постов пока нет.' }</p>
          </div>
        )
      ) : (
        <PostAdminTable>
          { rows.map(post => <PostAdminRow key={post.id} post={post} year={year} />) }
        </PostAdminTable>
      ) }

      <Pager page={page} pages={pages} href={n => adminPostsUrl({ ...filter, page: n })} />
    </>
  );
}

// Как в макете — четыре вкладки статусов; редкие уходят в «Ещё ▾»
const MAIN_TABS: { status: PostStatus, short: string }[] = [
  { status: 'published',  short: 'Опубликованы' },
  { status: 'moderating', short: 'На проверке' },
  { status: 'draft',      short: 'Черновики' },
  { status: 'blocked',    short: 'Заблок.' },
];

const MORE_TABS: PostStatus[] = [ 'rejected', 'hidden' ];
