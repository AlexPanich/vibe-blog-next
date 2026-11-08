'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import Link from "@/components/general/Link";
import { PostResource } from "@/domains/posts/dto/postResources";
import { StrictResource } from "@/core/resource";
import { formatRating } from "@/domains/posts/shared/formatRating";
import { POST_TYPE_LABELS } from "@/domains/posts/shared/postTypes";
import PostCover from "@/domains/posts/components/PostCover";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { IconArticle, IconAward, IconLanguage, IconMapPin } from "@tabler/icons-react";

type PostFeaturedProps<T extends PostResource> = {
  post: StrictResource<T, PostResource>,
  // Выбор редакции недели; иначе это просто самый свежий пост, без метки
  picked: boolean
}

const TYPE_ICONS = { simple: IconArticle, translate: IconLanguage, travel: IconMapPin };

/*
  Большой пост над карточками на главной (спека 30): обложка слева, справа метка «Выбор
  редакции», рубрика, заголовок, выдержка и автор с датой, временем чтения и оценкой.
  На телефоне — столбиком, как карточка
*/
export default function PostFeatured<T extends PostResource>({ post, picked }: PostFeaturedProps<T>) {
  const href = `/posts/${post.id}` as const;
  const rubric = post.tags[0];
  const TypeIcon = TYPE_ICONS[post.type];

  return <article className="ui-featured">
    <div className="ui-featured__media">
      <Link href={href} tabIndex={-1} aria-hidden className="ui-featured__cover">
        { post.cover ? <PostCover cover={post.cover} /> : <TypeIcon size={72} stroke={1.2} /> }
      </Link>
      { post.type !== 'simple' && <span className="ui-post-card__type">
        <TypeIcon size={14} stroke={2} />{ POST_TYPE_LABELS[post.type] }
      </span> }
    </div>

    <div className="ui-featured__text">
      { (picked || rubric) && <div className="ui-featured__top">
        { picked && <span className="ui-featured__pick"><IconAward size={14} stroke={2} />Выбор редакции</span> }
        { rubric && <Link href={`/posts?tag=${rubric.slug}`} className="ui-featured__rubric">{ rubric.name }</Link> }
      </div> }
      <h3 className="ui-featured__title">
        <Link href={href}>{ post.title }</Link>
      </h3>
      { post.excerpt && <p className="ui-featured__excerpt">{ post.excerpt }</p> }
      <Link href={`/authors/${post.userId}`} className="ui-featured__author">
        <UserAvatar name={post.author.name} avatarKey={post.author.avatarKey} size={44} />
        <span>
          <span className="ui-featured__name">{ post.author.name }</span>
          <span className="ui-featured__when">
            <LocalDate value={post.publishedAt ?? post.createdAt} options={{ day: 'numeric', month: 'long' }} />
            { ` · ${post.readingMinutes} мин чтения` }
            { post.rating.count > 0 && post.rating.average !== null && ` · ${formatRating(post.rating.average)} ★` }
          </span>
        </span>
      </Link>
    </div>
  </article>
}
