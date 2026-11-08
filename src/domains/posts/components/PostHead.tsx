import type { PostType } from "@/database/schema";
import LocalDate from "@/components/general/LocalDate";
import Link from "@/components/general/Link";
import PostModerateLink from "@/domains/posts/components/PostModerateLink";
import { POST_TYPE_LABELS } from "@/domains/posts/shared/postTypes";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import UserFollowButton from "@/domains/users/exports/UserFollowButton";
import { IconExternalLink, IconLanguage, IconMapPin } from "@tabler/icons-react";

type PostHeadProps = {
  post: {
    id: number,
    title: string,
    type: PostType,
    source: string | null,
    publishedAt: Date | null,
    createdAt: Date
  },
  author: { id: number, name: string, avatarKey: string | null },
  rubric?: { name: string, slug: string },
  readingMinutes: number
}

const TYPE_ICONS = { translate: IconLanguage, travel: IconMapPin };

/*
  Шапка страницы поста (спека 30): метка типа, рубрика и время чтения, заголовок, автор с
  датой и подпиской. Без 'use client' — рендерит серверная страница
*/
export default function PostHead({ post, author, rubric, readingMinutes }: PostHeadProps) {
  const TypeIcon = post.type === 'simple' ? null : TYPE_ICONS[post.type];

  return (
    <header className="ui-post__head">
      <div className="ui-post__crumbs">
        { TypeIcon && <span className="ui-post__type"><TypeIcon size={14} stroke={2} />{ POST_TYPE_LABELS[post.type] }</span> }
        { post.type === 'translate' && post.source && <a href={post.source} target="_blank" rel="noopener noreferrer nofollow">
          Оригинал<IconExternalLink size={13} stroke={1.8} />
        </a> }
        { rubric && <Link href={`/posts?tag=${rubric.slug}`} className="ui-post__rubric">{ rubric.name }</Link> }
        <span>{ readingMinutes } мин чтения</span>
        <PostModerateLink id={post.id} />
      </div>

      <h1 className="ui-post__title">{ post.title }</h1>

      <div className="ui-post__byline">
        <Link href={`/authors/${author.id}`} className="ui-post__author">
          <UserAvatar name={author.name} avatarKey={author.avatarKey} size={48} />
          <span>
            <span className="ui-post__name">{ author.name }</span>
            <LocalDate value={post.publishedAt ?? post.createdAt} options={{ dateStyle: 'long' }} />
          </span>
        </Link>
        <UserFollowButton authorId={author.id} />
      </div>
    </header>
  );
}
