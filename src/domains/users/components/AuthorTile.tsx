import Link from "@/components/general/Link";
import { plural } from "@/core/plural";
import UserAvatar from "@/domains/users/components/UserAvatar";
import UserFollowButton from "@/domains/users/components/UserFollowButton";

type AuthorTileProps = {
  author: {
    id: number,
    name: string,
    avatarKey: string | null,
    bio: string | null,
    postsCount: number,
    followersCount: number
  }
}

/*
  Плитка автора на главной (спека 30): фото, имя, «о себе», посты и читатели, подписка.
  На телефоне — узкая плитка в ленте, листаемой вбок: фото, имя и подписка.
  Без 'use client' — рендерит серверная страница
*/
export default function AuthorTile({ author }: AuthorTileProps) {
  const href = `/authors/${author.id}` as const;

  return (
    <article className="ui-author-tile">
      <Link href={href} tabIndex={-1} aria-hidden className="ui-author-tile__photo">
        <UserAvatar name={author.name} avatarKey={author.avatarKey} size={72} />
      </Link>
      <div className="ui-author-tile__text">
        <Link href={href} className="ui-author-tile__name">{ author.name }</Link>
        { author.bio && <p className="ui-author-tile__bio">{ author.bio }</p> }
      </div>
      <div className="ui-author-tile__foot">
        <span className="ui-author-tile__count">
          { author.postsCount } { plural(author.postsCount, [ 'пост', 'поста', 'постов' ]) } · { author.followersCount } { plural(author.followersCount, [ 'читатель', 'читателя', 'читателей' ]) }
        </span>
        <UserFollowButton authorId={author.id} />
      </div>
    </article>
  );
}
