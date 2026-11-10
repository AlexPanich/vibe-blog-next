'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import Link from "@/components/general/Link";
import { fieldError } from "@/components/general/FieldError";
import { StrictResource } from "@/core/resource";
import { plural } from "@/core/plural";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { hideCommentAction } from "@/domains/comments/actions/commentModerationActions";
import { keepCommentAction } from "@/domains/comments/actions/commentReportActions";
import { updateCommentAction } from "@/domains/comments/actions/commentActions";
import { COMMENT_MAX } from "@/domains/comments/dto/commentRequests";
import type { CommentReportRowResource } from "@/domains/comments/dto/commentResources";
import type { CommentReportResolution } from "@/database/schema";
import { Button, Menu, MenuDropdown, MenuItem, MenuTarget, Text, Textarea, TextInput } from "@mantine/core";
import { IconBan, IconCheck, IconDots, IconExternalLink, IconEyeOff, IconFlag, IconPencil, IconTrash } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

type CommentReportCardProps<T extends CommentReportRowResource> = {
  row: StrictResource<T, CommentReportRowResource>,
  // Свой комментарий модератор не разбирает — карточка без кнопок
  own: boolean,
  // «Заблокировать автора» и метка бана ведут в админку пользователя: бан есть только у admin
  canBan: boolean
}

/*
  Карточка жалоб на комментарий (спека 42, шаг 15): коралловая шапка (сколько жалоб, кто,
  когда последняя), комментарий с автором и постом, действия «Скрыть комментарий» (с
  причиной), «Править» (спека 24, жалобы остаются открытыми), «Отклонить жалобу», справа —
  «Заблокировать автора». На телефоне «Править» и бан — в меню «…», подписи короче («Скрыть», «Отклонить»). Рассмотренная — без
  действий, с итогом в шапке. Уже заблокированному автору бан не предлагается: у имени —
  метка «Заблокирован до …» (admin — ссылкой в админку), жалобы разбираются как обычно
*/
export default function CommentReportCard<T extends CommentReportRowResource>({ row, own, canBan }: CommentReportCardProps<T>) {
  const router = useRouter();
  const [ mode, setMode ] = useState<'idle' | 'hide' | 'edit'>('idle');
  const [ reason, setReason ] = useState('');
  const [ content, setContent ] = useState(row.content ?? '');
  const onSuccess = () => {
    setMode('idle');
    router.refresh();
  };
  const hide = useAction(hideCommentAction.bind(null, row.commentId), { onSuccess });
  const keep = useAction(keepCommentAction.bind(null, row.commentId), { onSuccess });
  const edit = useAction(updateCommentAction.bind(null, row.commentId), { onSuccess });
  const error = hide.result.serverError ?? keep.result.serverError ?? edit.result.serverError;
  const href = row.imageId === null
    ? `/posts/${row.postId}#comment-${row.commentId}` as const
    : `/posts/${row.postId}/images/${row.imageId}#comment-${row.commentId}` as const;
  const banHref = `/office/admin/users/${row.author.id}` as const;
  const count = row.reporters.length;
  const open = row.resolution === null;
  const banned = row.author.ban !== null;
  const banLabel = row.author.ban && <>
    <IconBan size={12} stroke={2.2} />Заблокирован{ ' ' }
    { row.author.ban.until ? <>до <LocalDate value={row.author.ban.until} options={{ day: 'numeric', month: 'short' }} /></> : 'навсегда' }
  </>;

  return (
    <article className="ui-report-card" data-resolved={!open}>
      <header className="ui-report-card__head">
        <IconFlag size={15} stroke={2} />
        <b>{ count } { plural(count, [ 'жалоба', 'жалобы', 'жалоб' ]) }</b>
        <span className="ui-report-card__who">
          { row.reporters.map(r => r.name).join(', ') }
          { open && <> · { count > 1 ? 'последняя ' : '' }<LocalDate value={row.lastAt} relative /></> }
        </span>
        { row.resolution && <span className="ui-report-card__outcome" data-kind={row.resolution.kind}>
          { OUTCOME_ICONS[row.resolution.kind] }
          { OUTCOME_LABELS[row.resolution.kind] }
          { row.resolution.by && <> · { row.resolution.by }</> }
          <span className="ui-report-card__outcome-when"> · <LocalDate value={row.resolution.at} options={{ day: 'numeric', month: 'short' }} /></span>
        </span> }
      </header>

      <div className="ui-report-card__comment">
        <UserAvatar name={row.author.name} avatarKey={row.author.avatarKey} size={40} />
        <div className="ui-report-card__body">
          <div className="ui-report-card__top">
            <span className="ui-report-card__name">{ row.author.name }</span>
            { banLabel && (canBan
              ? <Link href={banHref} className="ui-role-pill ui-report-card__banned" data-role="banned">{ banLabel }</Link>
              : <span className="ui-role-pill ui-report-card__banned" data-role="banned">{ banLabel }</span>) }
            <span className="ui-report-card__to">
              <span className="ui-report-card__to-long">{ row.imageId === null ? 'к посту' : 'к фото поста' } </span>
              <span className="ui-report-card__to-short">к </span>
              <Link href={href}>«{ row.postTitle }»</Link>
            </span>
          </div>

          { row.parent && <p className="ui-report-card__parent">
            Ответ { row.parent.state === 'deleted' ? 'на удалённый комментарий' : row.parent.authorName }
            { row.parent.state === 'visible' && <>: «{ row.parent.excerpt }»</> }
            { row.parent.state === 'hidden' && ' (скрыт модератором)' }
          </p> }

          { mode === 'edit' ? (
            <form className="ui-report-card__form" onSubmit={e => { e.preventDefault(); edit.execute({ content }) }}>
              <Textarea
                aria-label="Текст комментария"
                description="Автор получит уведомление о правке. Жалобы останутся открытыми"
                value={content}
                onChange={e => setContent(e.target.value)}
                error={fieldError(edit.result.validationErrors, 'content')}
                maxLength={COMMENT_MAX}
                autosize
                minRows={2}
                autoFocus
              />
              <div className="ui-report-card__buttons">
                <Button type="submit" size="sm" className="ui-ink-button" loading={edit.isPending}>Сохранить</Button>
                <Button size="sm" variant="subtle" color="gray" onClick={() => setMode('idle')}>Отмена</Button>
              </div>
            </form>
          ) : (
            <p className="ui-report-card__text">{ row.content ?? 'Комментарий удалён автором.' }</p>
          ) }
        </div>
      </div>

      { open && own && <p className="ui-report-card__note">Ваш комментарий — разберёт другой модератор.</p> }

      { open && !own && mode === 'hide' && <form className="ui-report-card__form ui-report-card__actions" onSubmit={e => { e.preventDefault(); hide.execute({ reason }) }}>
        <TextInput
          className="ui-report-card__reason"
          label="Причина скрытия"
          description="Её увидит автор комментария"
          value={reason}
          onChange={e => setReason(e.target.value)}
          error={fieldError(hide.result.validationErrors, 'reason')}
          autoFocus
        />
        <div className="ui-report-card__buttons">
          <Button type="submit" size="sm" className="ui-ink-button" leftSection={<IconEyeOff size={15} stroke={1.8} />} loading={hide.isPending}>Скрыть</Button>
          <Button size="sm" variant="subtle" color="gray" onClick={() => setMode('idle')}>Отмена</Button>
        </div>
      </form> }

      { open && !own && mode === 'idle' && <div className="ui-report-card__actions">
        <Button size="sm" className="ui-ink-button" leftSection={<IconEyeOff size={15} stroke={1.8} />} onClick={() => setMode('hide')}>
          Скрыть<span className="ui-report-card__desktop">&nbsp;комментарий</span>
        </Button>
        <Button
          size="sm"
          variant="default"
          className="ui-report-card__desktop"
          leftSection={<IconPencil size={15} stroke={1.8} />}
          onClick={() => { setContent(row.content ?? ''); setMode('edit') }}
        >
          Править
        </Button>
        <Button size="sm" variant="default" loading={keep.isPending} onClick={() => keep.execute()}>
          Отклонить<span className="ui-report-card__desktop">&nbsp;жалобу</span>
        </Button>

        { canBan && !banned && <Link href={banHref} className="ui-report-card__ban ui-report-card__desktop">
          <IconBan size={15} stroke={2} />Заблокировать автора
        </Link> }

        <Menu position="bottom-end" withinPortal>
          <MenuTarget>
            <button type="button" className="ui-report-card__more" aria-label="Ещё" title="Ещё">
              <IconDots size={16} stroke={1.8} />
            </button>
          </MenuTarget>
          <MenuDropdown>
            <MenuItem leftSection={<IconPencil size={16} stroke={1.8} />} onClick={() => { setContent(row.content ?? ''); setMode('edit') }}>
              Править
            </MenuItem>
            <MenuItem leftSection={<IconExternalLink size={16} stroke={1.8} />} renderRoot={props => <Link {...props} href={href} />}>
              Открыть в посте
            </MenuItem>
            { canBan && !banned && <MenuItem color="red" leftSection={<IconBan size={16} stroke={1.8} />} renderRoot={props => <Link {...props} href={banHref} />}>
              Заблокировать автора
            </MenuItem> }
          </MenuDropdown>
        </Menu>
      </div> }

      { error && <Text size="sm" c="red" className="ui-report-card__error">{ error.message }</Text> }
    </article>
  );
}

const OUTCOME_LABELS: Record<CommentReportResolution, string> = {
  hidden: 'Скрыт',
  kept: 'Оставлен',
  deleted: 'Удалён автором'
};

const OUTCOME_ICONS: Record<CommentReportResolution, ReactNode> = {
  hidden: <IconEyeOff size={14} stroke={2} />,
  kept: <IconCheck size={14} stroke={2} />,
  deleted: <IconTrash size={14} stroke={2} />
};
