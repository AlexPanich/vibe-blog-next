import { CONTAINER } from "@/globals/container";
import { db } from "@/globals/db";
import { posts, users } from "@/database/schema";
import { manageUsers } from "@/domains/users/policy";
import UserRow from "@/domains/users/components/UserRow";
import { userAdminFilterDto } from "@/domains/users/dto/userAdminRequests";
import { parseRoles } from "@/domains/users/shared/userRoles";
import { count, desc, eq, getTableColumns, isNotNull } from "drizzle-orm";
import Link from "@/components/general/Link";
import { IconUsers } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Пользователи' };

export default async function AdminUsers({ searchParams }: PageProps<'/office/admin/users'>) {
  await CONTAINER.boucerService.breakIfCant(manageUsers);

  const { filter } = userAdminFilterDto.parse(await searchParams);

  // Join, а не подзапрос: в подзапросе drizzle пишет колонки без таблицы, и "id" уходит к posts
  const list = await db.select({ ...getTableColumns(users), postsCount: count(posts.id) })
    .from(users)
    .leftJoin(posts, eq(posts.userId, users.id))
    .where(filter === 'banned' ? isNotNull(users.bannedAt) : undefined)
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Пользователи</h1>
        <span className="ui-kicker">Всего: { list.length }</span>
      </div>

      <nav className="ui-filter">
        <Link href="/office/admin/users" data-active={!filter}>Все</Link>
        <Link href="/office/admin/users?filter=banned" data-active={filter === 'banned'}>Заблокированные</Link>
      </nav>

      { list.length === 0 ? (
        <div className="ui-empty">
          <IconUsers size={26} stroke={1.6} />
          <p>Пользователей нет.</p>
        </div>
      ) : (
        <div className="ui-rows">
          { list.map(user => <UserRow key={user.id} user={{ ...user, roles: parseRoles(user.roles) }} />) }
        </div>
      ) }
    </>
  );
}
