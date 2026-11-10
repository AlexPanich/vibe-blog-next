import { CONTAINER } from "@/globals/container";
import { manageUsers } from "@/domains/users/policy";
import UserAdminTable from "@/domains/users/components/admin/UserAdminTable";
import UserAdminRow from "@/domains/users/components/admin/UserAdminRow";
import { userAdminFilterDto, type AdminUserTab } from "@/domains/users/dto/userAdminRequests";
import { loadAdminUsers } from "@/domains/users/shared/loadAdminUsers";
import { adminUsersUrl } from "@/domains/users/shared/adminUsersUrl";
import OfficeHead from "@/components/layout/OfficeHead";
import Link from "@/components/general/Link";
import OfficeSearch from "@/components/general/OfficeSearch";
import Pager from "@/components/general/Pager";
import { plural } from "@/core/plural";
import { IconSearch, IconUsers } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Пользователи' };

/*
  «Пользователи» в админке (спеки 42, 44): вкладки Все / Авторы / Модераторы / Заблокированные
  с числами (?role=), поиск по имени или email (?q=), таблица, пагинация (?page=)
*/
export default async function AdminUsers({ searchParams }: PageProps<'/office/admin/users'>) {
  await CONTAINER.boucerService.breakIfCant(manageUsers);

  const filter = userAdminFilterDto.parse(await searchParams);
  const { rows, all, found, page, pages } = await loadAdminUsers(filter);

  return (
    <>
      <OfficeHead
        title="Пользователи"
        sub={[
          `${all.total} ${plural(all.total, [ 'человек', 'человека', 'человек' ])}`,
          `${all.authors} ${plural(all.authors, [ 'автор', 'автора', 'авторов' ])}`,
          `${all.moderators} ${plural(all.moderators, [ 'модератор', 'модератора', 'модераторов' ])}`,
        ].join(' · ')}
      />

      <div className="ui-filter-bar">
        <nav className="ui-tabs" aria-label="Пользователи">
          { TABS.map(tab => (
            <Link key={tab.role ?? 'all'} href={adminUsersUrl({ role: tab.role, q: filter.q })} data-active={tab.role === filter.role}>
              { tab.short
                ? <>
                  <span className="ui-tabs__label-full">{ tab.label }</span>
                  <span className="ui-tabs__label-short">{ tab.short }</span>
                </>
                : <>{ tab.label } </> }
              <span className="ui-tabs__count">{ found[tab.count] }</span>
            </Link>
          )) }
        </nav>
        <OfficeSearch
          action="/office/admin/users"
          q={filter.q}
          placeholder="Имя или email"
          label="Поиск пользователя по имени или email"
          hidden={{ role: filter.role }}
          clearHref={adminUsersUrl({ role: filter.role })}
          className="ui-filter-bar__search"
        />
      </div>

      { rows.length === 0 ? (
        filter.q ? (
          <div className="ui-empty">
            <IconSearch size={26} stroke={1.6} />
            <p>По запросу «{ filter.q }» никого нет. <Link href={adminUsersUrl({ role: filter.role })}>Сбросить поиск</Link></p>
          </div>
        ) : (
          <div className="ui-empty">
            <IconUsers size={26} stroke={1.6} />
            <p>{ TABS.find(tab => tab.role === filter.role)?.empty }</p>
          </div>
        )
      ) : (
        <UserAdminTable>
          { rows.map(user => <UserAdminRow key={user.id} user={user} />) }
        </UserAdminTable>
      ) }

      <Pager page={page} pages={pages} href={n => adminUsersUrl({ ...filter, page: n })} />
    </>
  );
}

const TABS: { role: AdminUserTab | undefined, label: string, short?: string, count: 'total' | 'authors' | 'moderators' | 'banned', empty: string }[] = [
  { role: undefined,   label: 'Все',             count: 'total',      empty: 'Пользователей нет.' },
  { role: 'author',    label: 'Авторы',          count: 'authors',    empty: 'Авторов нет.' },
  { role: 'moderator', label: 'Модераторы',      count: 'moderators', empty: 'Модераторов нет.' },
  { role: 'banned',    label: 'Заблокированные', short: 'Заблок.', count: 'banned', empty: 'Заблокированных нет.' },
];
