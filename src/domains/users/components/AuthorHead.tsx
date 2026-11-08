import { imageUrl } from "@/core/imageUrl";
import { plural } from "@/core/plural";
import type { Role } from "@/database/schema";
import UserAvatar from "@/domains/users/components/UserAvatar";
import UserFollowButton from "@/domains/users/components/UserFollowButton";
import UserFollowersCount from "@/domains/users/components/UserFollowersCount";
import UserBlockGate from "@/domains/users/components/block/UserBlockGate";
import UserBlockButton from "@/domains/users/components/block/UserBlockButton";
import UserBlockMenuItem from "@/domains/users/components/block/UserBlockMenuItem";
import MessageAuthorActions from "@/domains/messages/exports/MessageAuthorActions";
import UserRoleBadge from "@/domains/users/components/UserRoleBadge";

type AuthorHeadProps = {
  author: { id: number, name: string, bio: string | null, avatarKey: string | null, roles: Role[], createdAt: Date },
  // Обложка последнего опубликованного поста; без неё — цветная плашка
  cover: { fileKey: string, width: number, height: number } | null,
  postsCount: number,
  followersCount: number,
  // Средняя оценка по опубликованным постам, уже строкой («4,8»)
  rating: string | null
}

const TONES = [ 'coral', 'sun', 'mint', 'plum' ] as const;

/*
  Шапка профиля автора (спека 30): баннер, большой аватар на его краю, имя с ролью, «о себе»,
  подписка и сообщение справа, ниже — цифры. Подписка, сообщения и цифры прячутся у того, кто
  автора заблокировал. На телефоне — столбиком, кнопка подписки во всю ширину.
  Без 'use client' — рендерит серверная страница
*/
export default function AuthorHead({ author, cover, postsCount, followersCount, rating }: AuthorHeadProps) {
  return (
    <section className="ui-author-head">
      <div className="ui-author-head__band" data-tone={cover ? undefined : TONES[author.id % TONES.length]}>
        { cover && <img
          src={imageUrl(cover.fileKey, 1600)}
          srcSet={`${imageUrl(cover.fileKey, 800)} 800w, ${imageUrl(cover.fileKey, 1600)} 1600w`}
          sizes="(max-width: 720px) 100vw, 1280px"
          width={cover.width}
          height={cover.height}
          alt=""
        /> }
      </div>
      <div className="ui-author-head__photo">
        <UserAvatar name={author.name} avatarKey={author.avatarKey} size={168} />
      </div>

      <div className="ui-author-head__main">
        <div className="ui-author-head__text">
          <div className="ui-author-head__name">
            <h1 className="ui-title">{ author.name }</h1>
            <UserRoleBadge roles={author.roles} className="ui-author-head__role" />
          </div>
          <UserBlockGate>
            { author.bio && <p className="ui-author-head__bio">{ author.bio }</p> }
          </UserBlockGate>
        </div>
        <UserBlockGate>
          <div className="ui-author-head__actions">
            <UserFollowButton authorId={author.id} withFriend />
            <MessageAuthorActions authorId={author.id} menuItems={<UserBlockMenuItem />} />
          </div>
        </UserBlockGate>
      </div>
      <UserBlockButton />

      <UserBlockGate>
        <dl className="ui-author-head__stats">
          <div>
            <dt>{ plural(postsCount, [ 'пост', 'поста', 'постов' ]) }</dt>
            <dd>{ postsCount.toLocaleString('ru-RU') }</dd>
          </div>
          <UserFollowersCount authorId={author.id} initial={followersCount} />
          { rating && <div>
            <dt><span className="ui-author-head__wide">средняя </span>оценка</dt>
            <dd>{ rating }</dd>
          </div> }
          <div className="ui-author-head__wide">
            <dt>в Vibe</dt>
            <dd>с { author.createdAt.getFullYear() }</dd>
          </div>
        </dl>
      </UserBlockGate>
    </section>
  );
}
