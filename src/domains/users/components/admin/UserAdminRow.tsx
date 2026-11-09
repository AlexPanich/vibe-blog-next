import Link from "@/components/general/Link";
import UserAvatar from "@/domains/users/components/UserAvatar";
import UserRolePills from "@/domains/users/components/UserRolePills";
import type { AdminUserRow } from "@/domains/users/shared/loadAdminUsers";
import LocalDate from "@/components/general/LocalDate";
import { isBanActive } from "@/shared/userBan";
import { IconChevronRight } from "@tabler/icons-react";

/*
  Строка «Пользователей» (спека 42, шаг 18): аватар, имя и email, роли или «Заблокирован»,
  число постов (всех статусов), месяц регистрации, «Открыть ›». Ссылка одна — имя, её
  ::after растянут на строку, поэтому кликается вся строка. На телефоне — аватар, имя,
  роли и шеврон. У заблокированного рядом с пилюлей — срок (спека 46), истёкший бан не виден
*/
export default function UserAdminRow({ user }: { user: AdminUserRow }) {
  const banned = isBanActive(user);
  const term = banned && (
    <span className="ui-admin-users__ban-term">
      { user.bannedUntil ? <>до <LocalDate value={user.bannedUntil} options={{ day: 'numeric', month: 'short' }} /></> : 'навсегда' }
    </span>
  );

  return (
    <div className="ui-admin-users__row" role="row">
      <div className="ui-admin-users__user" role="cell">
        <UserAvatar name={user.name} avatarKey={user.avatarKey} size={34} />
        <span className="ui-admin-users__who">
          <Link href={`/office/admin/users/${user.id}`} className="ui-admin-users__name">{ user.name }</Link>
          <span className="ui-admin-users__email">
            { user.email }{ !user.emailVerified && <> · <span className="ui-admin-users__unverified">не подтверждён</span></> }
          </span>
          <span className="ui-admin-users__mobile-roles">
            <UserRolePills roles={user.roles} banned={banned} />{ term }
          </span>
        </span>
      </div>
      <div className="ui-admin-users__roles" role="cell">
        <UserRolePills roles={user.roles} banned={banned} />{ term }
      </div>
      <span className="ui-admin-users__num" role="cell">{ user.postsCount }</span>
      <span className="ui-admin-users__num" role="cell">{ formatSince(user.createdAt) }</span>
      <span className="ui-admin-users__open" role="cell" aria-hidden>
        <span className="ui-admin-users__open-label">Открыть</span>
        <IconChevronRight size={16} stroke={2} />
      </span>
    </div>
  );
}

/*
  «март 2025» — месяц и год без «г.», как в макете. Считается на сервере: точность —
  месяц, расхождение часовых поясов на границе месяца не важно, а LocalDate дал бы
  «мар. 2025 г.»
*/
function formatSince(value: Date){
  return `${MONTHS[value.getMonth()]} ${value.getFullYear()}`;
}

const MONTHS = [ 'янв', 'фев', 'март', 'апр', 'май', 'июнь', 'июль', 'авг', 'сен', 'окт', 'нояб', 'дек' ];
