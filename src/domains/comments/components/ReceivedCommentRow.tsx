import 'client-only';
import type { ReceivedCommentResource } from "@/domains/comments/dto/commentResources";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import LocalDate from "@/components/general/LocalDate";
import { Button } from "@mantine/core";
import Link from "next/link";
import type { Route } from "next";
import { IconArrowBackUp } from "@tabler/icons-react";

/*
  Строка «К моим постам»: только чтение. Ответ и жалоба — на странице поста, куда ведёт
  «Ответить»
*/
export default function ReceivedCommentRow({ comment }: { comment: ReceivedCommentResource }) {
  // Собрана на сервере по тому же правилу, что ссылки уведомлений
  const href = comment.href as Route;

  return (
    <div className="ui-row ui-row--static">
      <div className="ui-row__body">
        <div className="ui-meta">
          <span className="ui-meta__item">
            <UserAvatar name={comment.author.name} avatarKey={comment.author.avatarKey} size={24} />{ comment.author.name }
          </span>
          <Link href={href} className="ui-meta__item">{ comment.postTitle }</Link>
          { comment.onImage && <span className="ui-meta__item">к фото</span> }
        </div>
        { comment.hidden
          ? <p className="ui-row__excerpt"><em>Скрыт модератором</em></p>
          : <p className="ui-row__excerpt">{ comment.content }</p> }
      </div>
      <div className="ui-row__aside">
        <span className="ui-meta ui-meta__item">
          <LocalDate value={comment.createdAt} relative />
          { comment.editedAt && <span>· { comment.editedByModerator ? 'изменён модератором' : 'изменён' }</span> }
        </span>
        { comment.canReply && <Button
          component={Link}
          href={href}
          size="compact-sm"
          variant="default"
          leftSection={<IconArrowBackUp size={14} />}
        >
          Ответить
        </Button> }
      </div>
    </div>
  );
}
