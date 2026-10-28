import { CONTAINER } from "@/globals/container";
import { db } from "@/globals/db";
import { authorRequests, comments, users } from "@/database/schema";
import { resource } from "@/core/resource";
import { requireAuthUser } from "@/shared/auth";
import { manageUsers } from "@/domains/users/policy";
import AuthorRequestRow from "@/domains/users/components/authorRequest/AuthorRequestRow";
import { authorRequestRowResource } from "@/domains/users/dto/userResources";
import { authorRequestAdminFilterDto } from "@/domains/users/dto/authorRequestRequests";
import { asc, count, desc, eq, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import Link from "next/link";
import { IconChecks } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Заявки в авторы' };

const TABS = {
  pending: { label: 'Ожидают',      empty: 'Новых заявок нет.' },
  decided: { label: 'Рассмотренные', empty: 'Рассмотренных заявок нет.' },
} as const;

// Рассмотренные — история для справки, хвоста хватает
const DECIDED_LIMIT = 50;

export default async function AdminAuthorRequests({ searchParams }: PageProps<'/office/admin/author-requests'>) {
  await CONTAINER.boucerService.breakIfCant(manageUsers);

  const me = await requireAuthUser();
  const { tab } = authorRequestAdminFilterDto.parse(await searchParams);
  const pending = tab === 'pending';
  const decider = alias(users, 'decider');
  const commentsCount = db.select({ userId: comments.userId, n: count().as('n') })
    .from(comments)
    .where(isNull(comments.deletedAt))
    .groupBy(comments.userId)
    .as('comments_count');

  // В очереди давние сверху, в истории — свежие решения
  const query = db.select({
    id: authorRequests.id,
    text: authorRequests.text,
    status: authorRequests.status,
    reason: authorRequests.reason,
    createdAt: authorRequests.createdAt,
    decidedAt: authorRequests.decidedAt,
    deciderName: decider.name,
    userId: users.id,
    userName: users.name,
    userAvatarKey: users.avatarKey,
    userCreatedAt: users.createdAt,
    userBannedAt: users.bannedAt,
    commentsCount: commentsCount.n
  })
    .from(authorRequests)
    .innerJoin(users, eq(users.id, authorRequests.userId))
    .leftJoin(decider, eq(decider.id, authorRequests.decidedBy))
    .leftJoin(commentsCount, eq(commentsCount.userId, users.id))
    .where(pending ? eq(authorRequests.status, 'pending') : ne(authorRequests.status, 'pending'))
    .orderBy(pending ? asc(authorRequests.createdAt) : desc(authorRequests.decidedAt), asc(authorRequests.id));
  const rows = await (pending ? query : query.limit(DECIDED_LIMIT));

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Заявки в авторы</h1>
        <span className="ui-kicker">{ TABS[tab].label }: { rows.length }</span>
      </div>

      <nav className="ui-filter">
        { (Object.keys(TABS) as (keyof typeof TABS)[]).map(t => (
          <Link key={t} href={t === 'pending' ? '/office/admin/author-requests' : `/office/admin/author-requests?tab=${t}`} data-active={t === tab}>
            { TABS[t].label }
          </Link>
        )) }
      </nav>

      { rows.length === 0 ? (
        <div className="ui-empty">
          <IconChecks size={26} stroke={1.6} />
          <p>{ TABS[tab].empty }</p>
        </div>
      ) : (
        <div className="ui-rows">
          { rows.map(row => <AuthorRequestRow
            key={row.id}
            row={resource(authorRequestRowResource, {
              ...row,
              user: {
                id: row.userId,
                name: row.userName,
                avatarKey: row.userAvatarKey,
                createdAt: row.userCreatedAt,
                banned: row.userBannedAt !== null,
                commentsCount: row.commentsCount ?? 0
              }
            })}
            own={row.userId === me.id}
          />) }
        </div>
      ) }
    </>
  );
}
