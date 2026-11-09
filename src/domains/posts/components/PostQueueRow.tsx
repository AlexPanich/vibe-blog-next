import ButtonLink from "@/components/general/ButtonLink";
import Link from "@/components/general/Link";
import LocalDate from "@/components/general/LocalDate";
import type { Post, Tag } from "@/database/types";
import { imageUrl } from "@/core/imageUrl";
import PostClaimButton from "@/domains/posts/components/PostClaimButton";
import type { PostRowData } from "@/domains/posts/shared/postRows";
import { tagTone } from "@/domains/tags/exports/tagTone";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { IconArrowRight, IconEye, IconHourglass, IconLock } from "@tabler/icons-react";

type PostQueueRowProps = {
  post: Pick<Post, 'id' | 'title' | 'createdAt' | 'submittedAt'> & Pick<PostRowData, 'cover'>,
  author: { name: string, avatarKey: string | null },
  tags: Pick<Tag, 'id' | 'name'>[],
  // free — никто не взял, mine — ревью ведёте вы, other — ведёт другой модератор
  review: 'free' | 'mine' | 'other',
  reviewer?: string
}

/*
  Строка очереди модерации (спека 42, шаг 13): обложка, заголовок, автор, рубрика, давность
  последней отправки (спека 49), кто ведёт ревью; справа — «Взять на ревью», «Продолжить» (своё ревью, рамка коралловая) или
  «Занят». Ссылка — на заголовке и растянута на строку, кнопка лежит поверх неё
*/
export default function PostQueueRow({ post, author, tags, review, reviewer }: PostQueueRowProps) {
  const href = `/office/moderation/posts/${post.id}` as const;
  const rubric = tags[0];

  return (
    <div className="ui-queue-row" data-review={review}>
      <span className="ui-queue-row__cover" data-tone={post.cover ? undefined : (rubric ? tagTone(rubric.id) : 'plain')}>
        { post.cover
          ? <img src={imageUrl(post.cover.fileKey, 400)} alt="" loading="lazy" />
          : <IconHourglass size={26} stroke={1.6} /> }
      </span>

      <div className="ui-queue-row__body">
        <h3 className="ui-queue-row__title"><Link href={href}>{ post.title }</Link></h3>
        <div className="ui-queue-row__meta">
          <span className="ui-queue-row__author">
            <UserAvatar name={author.name} avatarKey={author.avatarKey} size={22} />{ author.name }
          </span>
          { rubric && <span className="ui-queue-row__tag">#{ rubric.name }</span> }
          <span className="ui-queue-row__when">
            <span className="ui-queue-row__when-label">отправлен </span><LocalDate value={post.submittedAt ?? post.createdAt} relative />
          </span>
        </div>
        { review !== 'free' && <span className="ui-queue-row__reviewer">
          <IconEye size={13} stroke={2} />На ревью: { review === 'mine' ? 'Вы' : reviewer }
        </span> }
      </div>

      { review === 'free' && <PostClaimButton id={post.id} /> }
      { review === 'mine' && <ButtonLink href={href} className="ui-queue-row__action" leftSection={<IconArrowRight size={16} stroke={1.8} />}>
        Продолжить<span className="ui-queue-row__phone-only">&nbsp;ревью</span>
      </ButtonLink> }
      { review === 'other' && <span className="ui-queue-row__locked"><IconLock size={14} stroke={1.8} />Занят</span> }
    </div>
  );
}
