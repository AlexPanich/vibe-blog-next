'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import { fieldError } from "@/components/general/FieldError";
import { StrictResource } from "@/core/resource";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { hideCommentAction } from "@/domains/comments/actions/commentModerationActions";
import { keepCommentAction } from "@/domains/comments/actions/commentReportActions";
import type { CommentReportRowResource } from "@/domains/comments/dto/commentResources";
import { Button, Group, Text, TextInput } from "@mantine/core";
import { IconFlag } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CommentReportRowProps<T extends CommentReportRowResource> = {
  row: StrictResource<T, CommentReportRowResource>,
  // Свой комментарий модератор не разбирает — строка без кнопок
  own: boolean,
  // У admin имя автора ведёт в админку пользователя: бан — там
  adminLink: boolean
}

// Строка очереди жалоб: решение принимается по комментарию и закрывает все его жалобы.
export default function CommentReportRow<T extends CommentReportRowResource>({ row, own, adminLink }: CommentReportRowProps<T>) {
  const router = useRouter();
  const [ hiding, setHiding ] = useState(false);
  const [ reason, setReason ] = useState('');
  const hide = useAction(hideCommentAction.bind(null, row.commentId), { onSuccess: () => router.refresh() });
  const keep = useAction(keepCommentAction.bind(null, row.commentId), { onSuccess: () => router.refresh() });
  const error = hide.result.serverError ?? keep.result.serverError;
  const href = row.imageId === null
    ? `/posts/${row.postId}#comment-${row.commentId}` as const
    : `/posts/${row.postId}/images/${row.imageId}#comment-${row.commentId}` as const;
  const author = <><UserAvatar name={row.author.name} avatarKey={row.author.avatarKey} size={24} />{ row.author.name }</>;

  return (
    <div className="ui-row ui-report">
      <div className="ui-row__body">
        <div className="ui-meta">
          { adminLink
            ? <Link href={`/office/admin/users/${row.author.id}`} className="ui-meta__item">{ author }</Link>
            : <span className="ui-meta__item">{ author }</span> }
          <Link href={href}>{ row.postTitle }{ row.imageId !== null ? ', фото' : '' }</Link>
        </div>

        { row.parent && <p className="ui-report__parent">
          Ответ { row.parent.state === 'deleted' ? 'на удалённый комментарий' : row.parent.authorName }
          { row.parent.state === 'visible' && <>: «{ row.parent.excerpt }»</> }
          { row.parent.state === 'hidden' && ' (скрыт модератором)' }
        </p> }

        <p className="ui-comment__text">{ row.content }</p>

        <p className="ui-meta ui-meta__item">
          <IconFlag size={13} stroke={1.8} />
          Пожаловались: { row.reporters.map(r => r.name).join(', ') }
        </p>

        { own
          ? <Text size="sm" c="dimmed">Ваш комментарий — разберёт другой модератор.</Text>
          : hiding
            ? <form className="ui-comment-form" onSubmit={e => { e.preventDefault(); hide.execute({ reason }) }}>
              <TextInput
                label="Причина скрытия"
                description="Её увидит автор комментария"
                value={reason}
                onChange={e => setReason(e.target.value)}
                error={fieldError(hide.result.validationErrors, 'reason')}
                autoFocus
              />
              <Group gap="xs">
                <Button type="submit" size="compact-sm" color="red" loading={hide.isPending}>Скрыть</Button>
                <Button size="compact-sm" variant="subtle" color="gray" onClick={() => setHiding(false)}>Отмена</Button>
              </Group>
            </form>
            : <Group gap="xs">
              <Button size="compact-sm" color="red" variant="light" onClick={() => setHiding(true)}>Скрыть</Button>
              <Button size="compact-sm" variant="default" loading={keep.isPending} onClick={() => keep.execute()}>Оставить</Button>
            </Group> }

        { error && <Text size="sm" c="red">{ error.message }</Text> }
      </div>
      <div className="ui-row__aside">
        <span className="ui-meta">
          <LocalDate value={row.firstAt} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
        </span>
        { row.reporters.length > 1 && <span className="ui-meta">
          последняя <LocalDate value={row.lastAt} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
        </span> }
      </div>
    </div>
  );
}
