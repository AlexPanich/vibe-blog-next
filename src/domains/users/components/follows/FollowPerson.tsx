import Link from "@/components/general/Link";
import { plural } from "@/core/plural";
import UserAvatar from "@/domains/users/components/UserAvatar";
import { IconStarFilled, IconUsers } from "@tabler/icons-react";
import type { ReactNode } from "react";

type FollowPersonProps = {
  person: { id: number, name: string, avatarKey: string | null, bio: string | null, postsCount: number, rating: string | null },
  friend?: boolean,
  // Кнопка справа: подписка или разблокировка
  action: ReactNode,
  error?: string
}

/*
  Строка человека во вкладках «Подписок» (спека 42): аватар, имя, «о себе», посты и оценка,
  справа кнопка. У читателя без постов цифр нет. На телефоне цифры спрятаны, кнопка — круглая
  иконка. Без 'use client': рендерят клиентские строки UserFollowRow и UserBlockRow
*/
export default function FollowPerson({ person, friend = false, action, error }: FollowPersonProps) {
  const href = `/authors/${person.id}` as const;

  return (
    <li className="ui-follow-person">
      <Link href={href} tabIndex={-1} aria-hidden className="ui-follow-person__photo">
        <UserAvatar name={person.name} avatarKey={person.avatarKey} size={48} />
      </Link>
      <div className="ui-follow-person__text">
        <div className="ui-follow-person__name">
          <Link href={href}>{ person.name }</Link>
          { friend && <span className="ui-follow-person__friend"><IconUsers size={13} stroke={1.8} />друг</span> }
        </div>
        { person.bio && <p className="ui-follow-person__bio">{ person.bio }</p> }
      </div>
      { person.postsCount > 0 && (
        <p className="ui-follow-person__stats">
          <span>{ person.postsCount } { plural(person.postsCount, [ 'пост', 'поста', 'постов' ]) }</span>
          { person.rating && <span className="ui-follow-person__rating"><IconStarFilled size={13} />{ person.rating }</span> }
        </p>
      ) }
      <div className="ui-follow-person__action">{ action }</div>
      { error && <p className="ui-follow-person__error">{ error }</p> }
    </li>
  );
}
