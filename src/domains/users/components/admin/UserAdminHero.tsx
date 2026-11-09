import Link from "@/components/general/Link";
import UserAvatar from "@/domains/users/components/UserAvatar";
import UserRolePills from "@/domains/users/components/UserRolePills";
import type { AdminUserStats } from "@/domains/users/shared/loadAdminUser";
import type { User } from "@/database/types";
import { plural } from "@/core/plural";
import { formatMonthSince } from "@/domains/users/shared/formatMonthSince";
import { isBanActive } from "@/shared/userBan";
import { IconArrowUpRight } from "@tabler/icons-react";

type UserAdminHeroProps = {
  user: Pick<User, 'id' | 'name' | 'email' | 'emailVerified' | 'avatarKey' | 'bannedAt' | 'bannedUntil' | 'createdAt'>,
  stats: AdminUserStats
}

/*
  Шапка карточки пользователя в админке (спека 42, шаг 19): аватар, имя, email и «с нами с»,
  ссылка на страницу автора (есть у любого пользователя), справа цифры. У заблокированного
  рядом со ссылкой — пилюля «Заблокирован». На телефоне всё по центру
*/
export default function UserAdminHero({ user, stats }: UserAdminHeroProps) {
  const numbers = [
    { value: stats.posts, label: plural(stats.posts, [ 'пост', 'поста', 'постов' ]) },
    { value: stats.rating ?? '—', label: 'оценка' },
    { value: stats.followers, label: plural(stats.followers, [ 'подписчик', 'подписчика', 'подписчиков' ]) },
    { value: stats.reports, label: plural(stats.reports, [ 'жалоба', 'жалобы', 'жалоб' ]) },
  ];

  return (
    <header className="ui-user-hero">
      <UserAvatar name={user.name} avatarKey={user.avatarKey} size={96} />
      <div className="ui-user-hero__text">
        <h1 className="ui-user-hero__name">{ user.name }</h1>
        <p className="ui-user-hero__line">
          <span className="ui-user-hero__email">{ user.email }</span>
          { !user.emailVerified && <> · <span className="ui-user-hero__unverified">не подтверждён</span></> }
          { ' · ' }с нами с { formatMonthSince(user.createdAt) }
        </p>
        <div className="ui-user-hero__links">
          <Link href={`/authors/${user.id}`} className="ui-user-hero__link">
            Страница автора<IconArrowUpRight size={14} stroke={2} />
          </Link>
          { isBanActive(user) && <UserRolePills roles={[]} banned /> }
        </div>
      </div>
      <dl className="ui-user-hero__stats">
        { numbers.map(n => (
          <div key={n.label} className="ui-user-hero__stat">
            <dt>{ n.label }</dt>
            <dd>{ n.value }</dd>
          </div>
        )) }
      </dl>
    </header>
  );
}
