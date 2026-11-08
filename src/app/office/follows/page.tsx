import { resource } from "@/core/resource";
import UserFollowList from "@/domains/users/components/follows/UserFollowList";
import UserBlockRow from "@/domains/users/components/block/UserBlockRow";
import AuthorsFindBanner from "@/domains/users/components/follows/AuthorsFindBanner";
import { userBlockRowResource, userFollowRowListResource } from "@/domains/users/dto/userResources";
import { followCounts, loadFollowPeople, type FollowsTab } from "@/domains/users/shared/loadFollows";
import TagFollowList from "@/domains/tags/components/follows/TagFollowList";
import TagFollowCard from "@/domains/tags/components/follows/TagFollowCard";
import { tagRowListResource } from "@/domains/tags/dto/tagResources";
import { loadFollowedTags } from "@/domains/tags/shared/loadFollowedTags";
import { requireAuthUser } from "@/shared/auth";
import OfficeHead from "@/components/layout/OfficeHead";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import Link from "@/components/general/Link";
import { IconUsersGroup } from "@tabler/icons-react";
import type { Route } from "next";
import z from "zod";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Подписки' };

/*
  «Подписки» (спека 42, шаг 9): вкладки с числами (?tab=), список людей или рубрик; справа —
  «Мои рубрики» (кроме вкладки «Рубрики» — там они списком) и баннер «Найдите ещё авторов»
*/
export default async function OfficeFollows({ searchParams }: PageProps<'/office/follows'>) {
  const user = await requireAuthUser();
  const { tab } = tabDto.parse(await searchParams);
  const [ counts, tags ] = await Promise.all([ followCounts(user.id), loadFollowedTags(user.id) ]);

  return (
    <>
      <OfficeHead title="Подписки" sub="Авторы и рубрики, чьи посты собираются в вашей ленте" />

      <nav className="ui-tabs" aria-label="Подписки">
        { (Object.keys(TABS) as FollowsTab[]).map(t => (
          <Link key={t} href={t === 'following' ? '/office/follows' : `/office/follows?tab=${t}`} data-active={t === tab}>
            { TABS[t].label } <span className="ui-tabs__count">{ counts[t] }</span>
          </Link>
        )) }
      </nav>

      <div className="ui-follows">
        <div className="ui-follows__main">
          { tab === 'tags'
            ? <TagsTab tags={tags} />
            : <PeopleTab userId={user.id} tab={tab} /> }
        </div>
        <aside className="ui-follows__side">
          { tab !== 'tags' && <TagFollowCard tags={resource(tagRowListResource, tags)} /> }
          <AuthorsFindBanner />
        </aside>
      </div>
    </>
  );
}

// link — куда идти за следующим шагом; у подписчиков и блокировок своего шага нет
const TABS: Record<FollowsTab, { label: string, empty: EmptyText }> = {
  following: {
    label: 'Подписки',
    empty: { title: 'Вы пока ни на кого не подписаны', text: 'Подписаться можно на странице автора — его новые посты появятся в «Моей ленте».', link: { href: '/authors', label: 'К авторам' } }
  },
  followers: {
    label: 'Подписчики',
    empty: { title: 'На вас пока никто не подписан', text: 'Подписчики видят ваши новые посты в своей «Моей ленте».' }
  },
  tags: {
    label: 'Рубрики',
    empty: { title: 'Вы не подписаны ни на одну рубрику', text: 'Выберите рубрику в ленте — под фильтром появится кнопка подписки.', link: { href: '/posts', label: 'В ленту' } }
  },
  blocked: {
    label: 'Заблокированные',
    empty: { title: 'Вы никого не блокировали', text: 'Заблокировать можно на странице автора.' }
  },
};

const tabDto = z.object({ tab: z.enum([ 'following', 'followers', 'tags', 'blocked' ]).catch('following').default('following') });

async function PeopleTab({ userId, tab }: { userId: number, tab: Exclude<FollowsTab, 'tags'> }){
  const list = await loadFollowPeople(userId, tab);

  if(list.length === 0){
    return <Empty {...TABS[tab].empty} />;
  }

  // Разблокированный уходит из списка сразу, подписки — снимок (UserFollowList)
  return tab === 'blocked'
    ? <ul className="ui-follow-list">{ list.map(row => <UserBlockRow key={row.id} row={resource(userBlockRowResource, row)} />) }</ul>
    : <UserFollowList key={tab} rows={resource(userFollowRowListResource, list)} />;
}

function TagsTab({ tags }: { tags: Awaited<ReturnType<typeof loadFollowedTags>> }){
  if(tags.length === 0){
    return <Empty {...TABS.tags.empty} />;
  }

  return <TagFollowList tags={resource(tagRowListResource, tags)} />;
}

function Empty({ title, text, link }: EmptyText){
  return (
    <EmptyState icon={IconUsersGroup} title={title} action={link && <ButtonLink href={link.href} variant="default">{ link.label }</ButtonLink>}>
      { text }
    </EmptyState>
  );
}

type EmptyText = { title: string, text: string, link?: { href: Route, label: string } }
