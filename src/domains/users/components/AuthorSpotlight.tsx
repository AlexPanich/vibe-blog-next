import Link from "@/components/general/Link";
import { imageUrl } from "@/core/imageUrl";
import type { AuthorCover } from "@/domains/users/shared/authorCover";
import { authorTone } from "@/domains/users/shared/authorTone";
import { plural } from "@/core/plural";
import AuthorTopics from "@/domains/users/components/AuthorTopics";
import UserAvatar from "@/domains/users/components/UserAvatar";
import UserFollowButton from "@/domains/users/components/UserFollowButton";
import UserRoleBadge from "@/domains/users/components/UserRoleBadge";
import type { DirectoryAuthor } from "@/domains/users/shared/authorsDirectory";
import { IconArrowRight } from "@tabler/icons-react";

type AuthorSpotlightProps = {
  author: DirectoryAuthor,
  // Своя обложка профиля или обложка последнего поста; без неё — цветная плашка
  cover: AuthorCover | null,
  // Средняя оценка строкой («4,2»)
  rating: string | null
}

/*
  Большая карточка на странице авторов (спека 30): обложка, аватар на её краю, имя с ролью,
  «о себе», рубрики, цифры, подписка и «Профиль». На телефоне — узкая карточка в строке,
  листаемой вбок: рубрики прячутся, цифры — одной строкой. Без 'use client'
*/
export default function AuthorSpotlight({ author, cover, rating }: AuthorSpotlightProps) {
  const href = `/authors/${author.id}` as const;

  return (
    <article className="ui-spotlight">
      <div className="ui-spotlight__cover" data-tone={cover ? undefined : authorTone(author.id)}>
        { cover && <img
          src={imageUrl(cover.fileKey, 800)}
          width={cover.width}
          height={cover.height}
          loading="lazy"
          alt=""
        /> }
      </div>
      <Link href={href} tabIndex={-1} aria-hidden className="ui-spotlight__photo">
        <UserAvatar name={author.name} avatarKey={author.avatarKey} size={96} />
      </Link>

      <div className="ui-spotlight__body">
        <div className="ui-spotlight__name">
          <Link href={href}>{ author.name }</Link>
          <UserRoleBadge roles={author.roles} className="ui-spotlight__role" icon={12} />
        </div>
        { author.bio && <p className="ui-spotlight__bio">{ author.bio }</p> }
        <AuthorTopics topics={author.topics} />

        <dl className="ui-spotlight__stats">
          <div>
            <dd>{ author.postsCount }</dd>
            <dt>{ plural(author.postsCount, [ 'пост', 'поста', 'постов' ]) }</dt>
          </div>
          { rating && <div>
            <dd>{ rating }</dd>
            <dt>оценка</dt>
          </div> }
          <div>
            <dd>{ author.followersCount }</dd>
            <dt>{ plural(author.followersCount, [ 'читатель', 'читателя', 'читателей' ]) }</dt>
          </div>
        </dl>
        <p className="ui-spotlight__meta">
          { author.postsCount } { plural(author.postsCount, [ 'пост', 'поста', 'постов' ]) }
          { rating && <> · { rating } ★</> }
          { ' · ' }{ author.followersCount } { plural(author.followersCount, [ 'читатель', 'читателя', 'читателей' ]) }
        </p>

        <div className="ui-spotlight__actions">
          <UserFollowButton authorId={author.id} />
          <Link href={href} className="ui-pill ui-pill--outline ui-spotlight__profile">Профиль<IconArrowRight size={16} /></Link>
        </div>
      </div>
    </article>
  );
}
