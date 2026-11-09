import LocalDate from "@/components/general/LocalDate";
import type { Post, Tag } from "@/database/types";
import type { PostStatus } from "@/database/schema";
import { imageUrl } from "@/core/imageUrl";
import PostStatusTag from "@/domains/posts/components/PostStatusTag";
import { formatRating } from "@/domains/posts/shared/formatRating";
import type { PostRowData } from "@/domains/posts/shared/postRows";
import { tagTone } from "@/domains/tags/exports/tagTone";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { IconAlertCircle, IconArchive, IconCircleCheck, IconEye, IconHourglass, IconLock, IconMessageCircle, IconPencil, IconStar, type Icon } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "@/components/general/Link";
import type { ReactNode } from "react";

type PostRowProps<T extends string> = {
  post: Pick<Post, 'id' | 'title' | 'status' | 'createdAt' | 'publishedAt'> & Pick<PostRowData, 'cover' | 'rating' | 'commentsCount' | 'note'>,
  href: Route<T>,
  tags?: Pick<Tag, 'id' | 'name'>[],
  author?: { name: string, avatarKey: string | null },
  // Кто ведёт ревью — в очереди модерации
  reviewer?: string,
  // «Править» у черновика — в своих постах
  editable?: boolean,
  // Метка в конце меты — «На главной» в модерации (спека 39)
  badge?: ReactNode,
  // Кнопка справа поверх растянутой ссылки, как «Править» — выбор для главной (спека 39)
  side?: ReactNode
}

// Без обложки — иконка статуса на подложке цвета рубрики
const STATUS_ICONS: Record<PostStatus, Icon> = {
  draft: IconPencil,
  moderating: IconHourglass,
  published: IconCircleCheck,
  rejected: IconAlertCircle,
  hidden: IconArchive,
  blocked: IconLock,
};

/*
  Строка поста в списках кабинета (спека 42): миниатюра, заголовок, мета (статус, рубрика,
  дата), справа цифры опубликованного или «Править» у черновика; у отклонённого — замечание
  модератора. Ссылка — на заголовке и растянута на строку, «Править» и side лежат поверх неё
*/
export default function PostRow<T extends string>({ post, href, tags = [], author, reviewer, editable = false, badge, side }: PostRowProps<T>) {
  const rubric = tags[0];
  const StatusIcon = STATUS_ICONS[post.status];
  const showStats = post.status === 'published' || post.status === 'hidden';

  return (
    <div className="ui-post-row">
      <span className="ui-post-row__thumb" data-tone={post.cover ? undefined : (rubric ? tagTone(rubric.id) : 'plain')}>
        { post.cover
          ? <img src={imageUrl(post.cover.fileKey, 400)} alt="" loading="lazy" />
          : <StatusIcon size={24} stroke={1.6} /> }
      </span>

      <div className="ui-post-row__body">
        <h3 className="ui-post-row__title"><Link href={href}>{ post.title }</Link></h3>
        <div className="ui-post-row__meta">
          <PostStatusTag status={post.status} />
          { author && <span className="ui-post-row__author">
            <UserAvatar name={author.name} avatarKey={author.avatarKey} size={20} />{ author.name }
          </span> }
          { rubric && <span className="ui-post-row__tag">#{ rubric.name }</span> }
          <LocalDate value={post.publishedAt ?? post.createdAt} options={{ day: 'numeric', month: 'short' }} />
          { reviewer && <span className="ui-post-row__reviewer"><IconEye size={14} stroke={1.8} />На ревью: { reviewer }</span> }
          { badge }
        </div>
        { post.note && <p className="ui-post-row__note">
          <IconAlertCircle size={14} stroke={1.8} />Модератор: { post.note }
        </p> }
      </div>

      <div className="ui-post-row__side">
        { showStats && <>
          { post.rating.count > 0 && post.rating.average !== null && <span title={`Средняя оценка, оценок: ${post.rating.count}`}>
            <IconStar size={14} stroke={1.8} />{ formatRating(post.rating.average) }
          </span> }
          <span title="Комментарии"><IconMessageCircle size={14} stroke={1.8} />{ post.commentsCount }</span>
        </> }
        { editable && post.status === 'draft' && <Link href={`/office/posts/${post.id}/edit`} className="ui-post-row__edit">
          <IconPencil size={14} stroke={1.8} />Править
        </Link> }
        { side }
      </div>
    </div>
  );
}
