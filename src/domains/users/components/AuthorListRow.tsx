import Link from "@/components/general/Link";
import { plural } from "@/core/plural";
import AuthorTopics from "@/domains/users/components/AuthorTopics";
import UserAvatar from "@/domains/users/components/UserAvatar";
import UserFollowButton from "@/domains/users/components/UserFollowButton";
import UserRoleBadge from "@/domains/users/components/UserRoleBadge";
import type { DirectoryAuthor } from "@/domains/users/shared/authorsDirectory";

/*
  Строка списка «Все авторы» (спека 30): автор с «о себе», рубрики, посты, оценка,
  читатели, подписка. На телефоне — аватар, имя, цифры одной строкой и круглая подписка.
  Без 'use client'
*/
export default function AuthorListRow({ author, rating }: { author: DirectoryAuthor, rating: string | null }) {
  const href = `/authors/${author.id}` as const;

  return (
    <li className="ui-authors-row">
      <div className="ui-authors-row__who">
        <Link href={href} tabIndex={-1} aria-hidden className="ui-authors-row__photo">
          <UserAvatar name={author.name} avatarKey={author.avatarKey} size={52} />
        </Link>
        <div className="ui-authors-row__text">
          <div className="ui-authors-row__name">
            <Link href={href}>{ author.name }</Link>
            <UserRoleBadge roles={author.roles} className="ui-authors-row__role" staffOnly icon={false} />
          </div>
          { author.bio && <p className="ui-authors-row__bio">{ author.bio }</p> }
          <p className="ui-authors-row__meta">
            { author.postsCount } { plural(author.postsCount, [ 'пост', 'поста', 'постов' ]) }
            { rating && <> · { rating } ★</> }
            { ' · ' }{ author.followersCount } { plural(author.followersCount, [ 'читатель', 'читателя', 'читателей' ]) }
          </p>
        </div>
      </div>
      <div className="ui-authors-row__topics"><AuthorTopics topics={author.topics.slice(0, 2)} /></div>
      <span className="ui-authors-row__num" data-label="Постов">{ author.postsCount }</span>
      <span className="ui-authors-row__num" data-label="Оценка">{ rating ? `${rating} ★` : '—' }</span>
      <span className="ui-authors-row__num" data-label="Читателей">{ author.followersCount }</span>
      <div className="ui-authors-row__action"><UserFollowButton authorId={author.id} /></div>
    </li>
  );
}
