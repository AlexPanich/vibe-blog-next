'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import { PostResource } from "@/domains/posts/dto/postResources";
import { formatRating } from "@/domains/posts/shared/formatRating";
import { POST_TYPE_LABELS } from "@/domains/posts/shared/postTypes";
import PostCover from "@/domains/posts/components/PostCover";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { IconArticle, IconLanguage, IconMapPin, IconMessageCircle, IconStar } from "@tabler/icons-react";
import Link from "@/components/general/Link";

const TYPE_ICONS = { simple: IconArticle, translate: IconLanguage, travel: IconMapPin };

// Цвет плашки без обложки — по id, чтобы соседние карточки различались и не мигали между рендерами
const TONES = [ 'coral', 'sun', 'mint', 'plum' ] as const;

/*
  Карточка поста (спека 30): обложка или цветная плашка с меткой типа, рубрика, заголовок,
  выдержка; внизу автор с датой и временем чтения, справа оценка и комментарии
*/
export default function PostCard({ post }: { post: PostResource }) {
  const href = `/posts/${post.id}` as const;
  const rubric = post.tags[0];
  const TypeIcon = TYPE_ICONS[post.type];

  return <article className="ui-post-card">
    <div className="ui-post-card__media" data-tone={post.cover ? undefined : TONES[post.id % TONES.length]}>
      <Link href={href} tabIndex={-1} aria-hidden className="ui-post-card__cover">
        { post.cover ? <PostCover cover={post.cover} /> : <TypeIcon size={56} stroke={1.3} /> }
      </Link>
      { post.type !== 'simple' && <span className="ui-post-card__type">
        <TypeIcon size={14} stroke={2} />{ POST_TYPE_LABELS[post.type] }
      </span> }
    </div>

    <div className="ui-post-card__body">
      { rubric && <Link href={`/posts?tag=${rubric.slug}`} className="ui-post-card__rubric">{ rubric.name }</Link> }
      <h3 className="ui-post-card__title">
        <Link href={href}>{ post.title }</Link>
      </h3>
      { post.excerpt && <p className="ui-post-card__excerpt">{ post.excerpt }</p> }
    </div>

    <div className="ui-post-card__foot">
      <Link href={`/authors/${post.userId}`} className="ui-post-card__author">
        <UserAvatar name={post.author.name} avatarKey={post.author.avatarKey} size={32} />
        <span>
          <span className="ui-post-card__name">{ post.author.name }</span>
          <span className="ui-post-card__when">
            <LocalDate value={post.publishedAt ?? post.createdAt} options={{ day: 'numeric', month: 'short' }} /> · { post.readingMinutes } мин
          </span>
        </span>
      </Link>
      <span className="ui-post-card__stats">
        { post.rating.count > 0 && post.rating.average !== null && <span title={`Средняя оценка, оценок: ${post.rating.count}`}>
          <IconStar size={15} stroke={1.8} />{ formatRating(post.rating.average) }
        </span> }
        <span title="Комментарии">
          <IconMessageCircle size={15} stroke={1.8} />{ post.commentsCount }
        </span>
      </span>
    </div>
  </article>
}
