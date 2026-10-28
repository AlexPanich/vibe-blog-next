'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import { fieldError } from "@/components/general/FieldError";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { deleteCommentAction } from "@/domains/comments/actions/commentActions";
import { hideCommentAction, unhideCommentAction } from "@/domains/comments/actions/commentModerationActions";
import { reportCommentAction } from "@/domains/comments/actions/commentReportActions";
import CommentForm from "@/domains/comments/components/CommentForm";
import CommentReactions from "@/domains/comments/components/CommentReactions";
import { useCommentsContext } from "@/domains/comments/components/commentsContext";
import { editComment, hideComment, manageComment, reactComment, replyComment, reportComment, unhideComment } from "@/domains/comments/policy";
import { CommentNode, INDENT_LEVELS, INDENT_LEVELS_SM } from "@/domains/comments/shared/commentTree";
import { Anchor, Button, Group, Text, TextInput } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useState } from "react";

type CommentItemProps = {
  node: CommentNode,
  depth: number,
  // Авторы предков без заглушек «удалён» — у них право жаловаться на ответы в своей ветке
  ancestorAuthorIds: number[],
  // Кому ответили — для пометки «→ имя», когда отступ больше не растёт
  parentName?: string
}

type Mode = 'view' | 'reply' | 'edit' | 'delete' | 'hide'

// Комментарий и его ветка. Действия — по policy домена, сервер проверяет их ещё раз.
export default function CommentItem({ node, depth, ancestorAuthorIds, parentName }: CommentItemProps) {
  const { postId, imageId, postAuthorId, user, viewer, viewerLoaded, setReaction, setHidden, setReport } = useCommentsContext();
  const [ mode, setMode ] = useState<Mode>('view');
  const [ reason, setReason ] = useState('');
  const close = () => setMode('view');
  const remove = useAction(deleteCommentAction.bind(null, node.id), { onSuccess: close });
  const hide = useAction(hideCommentAction.bind(null, node.id), {
    onSuccess: ({ data }) => { setHidden(node.id, data); setReason(''); close() }
  });
  const unhide = useAction(unhideCommentAction.bind(null, node.id), { onSuccess: () => setHidden(node.id, null) });
  const report = useAction(reportCommentAction.bind(null, node.id), { onSuccess: ({ data }) => setReport(node.id, data.state) });
  const facts = { userId: node.userId, state: node.state };
  // Блокировка (спека 26): с тем, кто связан ею, — ни ответа, ни реакции; заблокированного мной — не вижу
  const blockedWith = viewer.blockedWith.includes(node.userId);
  const blocking = node.state !== 'deleted' && viewer.blocking.includes(node.userId);
  const hiddenText = viewer.hidden[node.id];
  const reportState = viewer.reports[node.id];
  const canReport = !!user && viewerLoaded && reportComment(user, facts, { postAuthorId, ancestorAuthorIds });
  const replyAncestors = node.state === 'deleted' ? ancestorAuthorIds : [ ...ancestorAuthorIds, node.userId ];
  const error = remove.result.serverError ?? hide.result.serverError ?? unhide.result.serverError ?? report.result.serverError;

  return (
    <div className="ui-comment" id={`comment-${node.id}`}>
      { blocking ? <p className="ui-comment__stub">Комментарий скрыт — вы заблокировали автора</p> : <>
        <div className="ui-comment__head">
          { node.state === 'deleted'
            ? <span className="ui-comment__author">—</span>
            : <Link href={`/authors/${node.userId}`} className="ui-comment__author">
              <UserAvatar name={node.authorName} avatarKey={node.authorAvatarKey} size={24} />{ node.authorName }
            </Link> }
          { depth > INDENT_LEVELS_SM && parentName && <span className="ui-comment__to" data-from={depth > INDENT_LEVELS ? 'all' : 'sm'}>→ { parentName }</span> }
          <LocalDate value={node.createdAt} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
          { node.editedAt && node.state === 'visible' && <span className="ui-comment__edited">{ node.editedByModerator ? 'изменён модератором' : 'изменён' }</span> }
        </div>

        { mode === 'edit'
          ? <CommentForm target={{ id: node.id, content: node.content }} submitLabel="Сохранить" autoFocus onDone={close} onCancel={close} />
          : <Body node={node} hiddenText={hiddenText} own={user?.id === node.userId} /> }

        { node.state !== 'deleted' && mode !== 'edit' && <Group gap="md" className="ui-comment__actions">
          <CommentReactions
            id={node.id}
            likes={node.likes}
            dislikes={node.dislikes}
            mine={viewer.myReactions[node.id]}
            canReact={!!user && !blockedWith && reactComment(user, facts)}
            onReacted={mine => setReaction(node.id, mine)}
          />
          { user && !blockedWith && replyComment(facts) && <Anchor component="button" size="sm" onClick={() => setMode('reply')}>Ответить</Anchor> }
          { user && editComment(user, facts) && <Anchor component="button" size="sm" onClick={() => setMode('edit')}>Изменить</Anchor> }
          { user && manageComment(user, facts) && <Anchor component="button" size="sm" c="red" onClick={() => setMode('delete')}>Удалить</Anchor> }
          { user && hideComment(user, facts) && <Anchor component="button" size="sm" c="dimmed" onClick={() => setMode('hide')}>Скрыть</Anchor> }
          { user && unhideComment(user, facts) && <Anchor component="button" size="sm" c="dimmed" onClick={() => unhide.execute()}>Вернуть</Anchor> }
          { canReport && (reportState
            ? <Text size="sm" c="dimmed">{ reportState === 'resolved' ? 'Жалоба рассмотрена' : 'Жалоба отправлена' }</Text>
            : <Anchor component="button" size="sm" c="dimmed" disabled={report.isPending} onClick={() => report.execute()}>Пожаловаться</Anchor>) }
        </Group> }

        { mode === 'delete' && <Group gap="xs" className="ui-comment__confirm">
          <Text size="sm">Удалить комментарий?</Text>
          <Button size="compact-sm" color="red" loading={remove.isPending} onClick={() => remove.execute()}>Удалить</Button>
          <Button size="compact-sm" variant="subtle" color="gray" onClick={close}>Отмена</Button>
        </Group> }

        { mode === 'hide' && <form className="ui-comment-form" onSubmit={e => { e.preventDefault(); hide.execute({ reason }) }}>
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
            <Button size="compact-sm" variant="subtle" color="gray" onClick={close}>Отмена</Button>
          </Group>
        </form> }

        { error && <Text size="sm" c="red">{ error.message }</Text> }
      </> }

      { mode === 'reply' && <CommentForm
        target={{ postId, imageId, parentId: node.id }}
        submitLabel="Ответить"
        placeholder={`Ответ для ${node.authorName}`}
        autoFocus
        onDone={close}
        onCancel={close}
      /> }

      { node.replies.length > 0 && <div
        className="ui-comment__replies"
        data-flat={depth + 1 > INDENT_LEVELS || undefined}
        data-flat-sm={depth + 1 > INDENT_LEVELS_SM || undefined}
      >
        { node.replies.map(reply => <CommentItem key={reply.id} node={reply} depth={depth + 1} ancestorAuthorIds={replyAncestors} parentName={node.state === 'deleted' ? undefined : node.authorName} />) }
      </div> }
    </div>
  );
}

type BodyProps = {
  node: CommentNode,
  hiddenText?: { content: string, reason: string },
  own: boolean
}

function Body({ node, hiddenText, own }: BodyProps){
  if(node.state === 'deleted'){
    return <p className="ui-comment__stub">Комментарий удалён</p>
  }

  if(node.state === 'hidden'){
    // Текст приходит только автору и модератору — запросом после гидрации
    return <>
      <p className="ui-comment__stub">
        Скрыт модератором{ hiddenText && own ? `: ${hiddenText.reason}` : '' }
      </p>
      { hiddenText && <p className="ui-comment__text ui-comment__text--hidden">{ hiddenText.content }</p> }
      { hiddenText && !own && <p className="ui-comment__stub">Причина: { hiddenText.reason }</p> }
    </>
  }

  return <p className="ui-comment__text">{ node.content }</p>
}
