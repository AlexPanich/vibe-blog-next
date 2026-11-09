import 'client-only';
import type { OfficeCommentResource } from "@/domains/comments/dto/commentResources";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import ClientValue from "@/components/general/ClientValue";
import Link from "@/components/general/Link";
import { formatWhen } from "@/shared/localDays";
import type { Route } from "next";
import { IconArrowBackUp, IconExternalLink, IconEyeOff } from "@tabler/icons-react";

/*
  Карточка комментария в кабинете (спека 42, шаг 10): аватар, имя, «к посту «…»», время, текст,
  «Ответить» / «Открыть в посте». Только чтение: ответ и жалоба — на странице поста. Скрытый
  модератором приглушён, с пометкой; свой — с текстом и причиной, чужой — без них
*/
export default function OfficeCommentCard({ comment, isNew = false }: { comment: OfficeCommentResource, isNew?: boolean }) {
  // Собрана на сервере по тому же правилу, что ссылки уведомлений
  const href = comment.href as Route;
  const replyHref = href.replace(/#comment-(\d+)$/, '#reply-$1') as Route;

  return (
    <article className="ui-office-comment" data-hidden={comment.hidden} data-new={isNew}>
      <UserAvatar name={comment.author.name} avatarKey={comment.author.avatarKey} size={40} />
      <div className="ui-office-comment__body">
        <div className="ui-office-comment__top">
          <span className="ui-office-comment__who">
            <span className="ui-office-comment__name">{ comment.author.name }</span>
            { isNew && <span className="ui-office-comment__new">Новый</span> }
          </span>
          <span className="ui-office-comment__meta">
            <span className="ui-office-comment__to">
              { comment.onImage ? 'к фото поста' : 'к посту' } <Link href={href}>«{ comment.postTitle }»</Link>
            </span>
            <span className="ui-office-comment__when">
              <time dateTime={comment.createdAt.toISOString()}><ClientValue server="" client={() => formatWhen(comment.createdAt)} /></time>
              { comment.editedAt && <> · { comment.editedByModerator ? 'изменён модератором' : 'изменён' }</> }
            </span>
          </span>
        </div>

        { comment.hidden && <span className="ui-office-comment__hidden"><IconEyeOff size={13} stroke={2} />Скрыт модератором</span> }

        <p className="ui-office-comment__text">
          { comment.content ?? 'Текст видят только автор и модераторы.' }
        </p>

        { comment.hideReason && <p className="ui-office-comment__reason">Причина: { comment.hideReason }</p> }

        <div className="ui-office-comment__actions">
          { comment.canReply && <Link href={replyHref}><IconArrowBackUp size={14} stroke={2} />Ответить</Link> }
          <Link href={href}><IconExternalLink size={14} stroke={2} />{ href.startsWith('/office/') ? 'Пост в кабинете' : 'Открыть в посте' }</Link>
        </div>
      </div>
    </article>
  );
}
