import { db } from "@/globals/db";
import { tagFollows, tags, userBlocks, userFollows, users } from "@/database/schema";
import { resource } from "@/core/resource";
import UserFollowRow from "@/domains/users/components/UserFollowRow";
import { userBlockRowResource, userFollowRowResource } from "@/domains/users/dto/userResources";
import UserBlockRow from "@/domains/users/components/block/UserBlockRow";
import TagFollowRow from "@/domains/tags/exports/TagFollowRow";
import { tagResource } from "@/domains/tags/exports/tagResources";
import { sortTags } from "@/domains/tags/exports/tagNames";
import { requireAuthUser } from "@/shared/auth";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import { and, eq, exists } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import Link from "next/link";
import { IconUsersGroup } from "@tabler/icons-react";
import type { Route } from "next";
import z from "zod";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Подписки' };

// link — куда идти за следующим шагом; у подписчиков и блокировок своего шага нет
const TABS: Record<'following' | 'followers' | 'tags' | 'blocked', { label: string, empty: EmptyText }> = {
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

type Tab = keyof typeof TABS

const tabDto = z.object({ tab: z.enum([ 'following', 'followers', 'tags', 'blocked' ]).catch('following').default('following') });

export default async function OfficeFollows({ searchParams }: PageProps<'/office/follows'>) {
  const user = await requireAuthUser();
  const { tab } = tabDto.parse(await searchParams);

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Подписки</h1>
      </div>

      <nav className="ui-filter">
        { (Object.keys(TABS) as Tab[]).map(t => (
          <Link key={t} href={t === 'following' ? '/office/follows' : `/office/follows?tab=${t}`} data-active={t === tab}>
            { TABS[t].label }
          </Link>
        )) }
      </nav>

      { tab === 'tags'
        ? <TagsTab userId={user.id} />
        : tab === 'blocked' ? <BlockedTab userId={user.id} /> : <PeopleTab userId={user.id} tab={tab} /> }
    </>
  );
}

/*
  Подписки и подписчики — одна выборка с разной стороной связи. friend — есть встречная
  подписка; в «Подписках» я подписан всегда, в «Подписчиках» — когда это друг
*/
async function PeopleTab({ userId, tab }: { userId: number, tab: Exclude<Tab, 'tags' | 'blocked'> }){
  const mine = tab === 'following';
  const back = alias(userFollows, 'back');
  const theirSide = mine ? userFollows.followingId : userFollows.followerId;
  const rows = await db.select({
    id: users.id,
    name: users.name,
    avatarKey: users.avatarKey,
    friend: exists(db.select().from(back).where(and(
      eq(back.followerId, mine ? users.id : userId),
      eq(back.followingId, mine ? userId : users.id)
    )))
  })
    .from(userFollows)
    .innerJoin(users, eq(users.id, theirSide))
    .where(eq(mine ? userFollows.followerId : userFollows.followingId, userId));

  const list = rows
    .map(r => ({ ...r, friend: !!r.friend, following: mine || !!r.friend }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return list.length === 0
    ? <Empty {...TABS[tab].empty} />
    : <div className="ui-rows">
      { list.map(row => <UserFollowRow key={row.id} row={resource(userFollowRowResource, row)} />) }
    </div>;
}

async function TagsTab({ userId }: { userId: number }){
  const list = sortTags(await db.select({ id: tags.id, name: tags.name, slug: tags.slug })
    .from(tagFollows)
    .innerJoin(tags, eq(tags.id, tagFollows.tagId))
    .where(eq(tagFollows.userId, userId)));

  return list.length === 0
    ? <Empty {...TABS.tags.empty} />
    : <div className="ui-rows">
      { list.map(tag => <TagFollowRow key={tag.id} tag={resource(tagResource, tag)} />) }
    </div>;
}

// Только свои блокировки: кто заблокировал меня, здесь не видно (спека 26)
async function BlockedTab({ userId }: { userId: number }){
  const list = (await db.select({ id: users.id, name: users.name, avatarKey: users.avatarKey })
    .from(userBlocks)
    .innerJoin(users, eq(users.id, userBlocks.blockedId))
    .where(eq(userBlocks.userId, userId)))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return list.length === 0
    ? <Empty {...TABS.blocked.empty} />
    : <div className="ui-rows">
      { list.map(row => <UserBlockRow key={row.id} row={resource(userBlockRowResource, row)} />) }
    </div>;
}

function Empty({ title, text, link }: EmptyText){
  return (
    <EmptyState icon={IconUsersGroup} title={title} action={link && <ButtonLink href={link.href} variant="default">{ link.label }</ButtonLink>}>
      { text }
    </EmptyState>
  );
}

type EmptyText = { title: string, text: string, link?: { href: Route, label: string } }
