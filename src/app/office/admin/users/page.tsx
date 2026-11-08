import { CONTAINER } from "@/globals/container";
import { manageUsers } from "@/domains/users/policy";
import UserAdminTable from "@/domains/users/components/admin/UserAdminTable";
import UserAdminRow from "@/domains/users/components/admin/UserAdminRow";
import { userAdminFilterDto } from "@/domains/users/dto/userAdminRequests";
import { loadAdminUsers } from "@/domains/users/shared/loadAdminUsers";
import { adminUsersUrl } from "@/domains/users/shared/adminUsersUrl";
import OfficeHead from "@/components/layout/OfficeHead";
import Link from "@/components/general/Link";
import Pager from "@/components/general/Pager";
import { plural } from "@/core/plural";
import { IconUsers } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Пользователи' };

/*
  «Пользователи» в админке (спека 42, шаг 18): вкладки «Все / Заблокированные» с числами
  (?filter=), таблица, пагинация (?page=). Вкладки по ролям и поиск — спека 44
*/
export default async function AdminUsers({ searchParams }: PageProps<'/office/admin/users'>) {
  await CONTAINER.boucerService.breakIfCant(manageUsers);

  const filter = userAdminFilterDto.parse(await searchParams);
  const { rows, counts, page, pages } = await loadAdminUsers(filter);

  return (
    <>
      <OfficeHead
        title="Пользователи"
        sub={[
          `${counts.total} ${plural(counts.total, [ 'человек', 'человека', 'человек' ])}`,
          `${counts.authors} ${plural(counts.authors, [ 'автор', 'автора', 'авторов' ])}`,
          `${counts.moderators} ${plural(counts.moderators, [ 'модератор', 'модератора', 'модераторов' ])}`,
        ].join(' · ')}
      />

      <nav className="ui-tabs" aria-label="Пользователи">
        <Link href={adminUsersUrl({})} data-active={!filter.filter}>
          Все <span className="ui-tabs__count">{ counts.total }</span>
        </Link>
        <Link href={adminUsersUrl({ filter: 'banned' })} data-active={filter.filter === 'banned'}>
          <span className="ui-tabs__label-full">Заблокированные</span>
          <span className="ui-tabs__label-short">Заблок.</span>
          <span className="ui-tabs__count">{ counts.banned }</span>
        </Link>
      </nav>

      { rows.length === 0 ? (
        <div className="ui-empty">
          <IconUsers size={26} stroke={1.6} />
          <p>{ filter.filter === 'banned' ? 'Заблокированных нет.' : 'Пользователей нет.' }</p>
        </div>
      ) : (
        <UserAdminTable>
          { rows.map(user => <UserAdminRow key={user.id} user={user} />) }
        </UserAdminTable>
      ) }

      <Pager page={page} pages={pages} href={n => adminUsersUrl({ ...filter, page: n })} />
    </>
  );
}
