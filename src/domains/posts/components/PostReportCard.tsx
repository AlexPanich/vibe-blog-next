'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import Link from "@/components/general/Link";
import { fieldError } from "@/components/general/FieldError";
import { StrictResource } from "@/core/resource";
import { plural } from "@/core/plural";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { blockReportedPostAction, keepReportedPostAction } from "@/domains/posts/actions/postReportActions";
import type { PostReportRowResource } from "@/domains/posts/dto/postResources";
import PostStatusTag from "@/domains/posts/components/PostStatusTag";
import { POST_REPORT_REASON_LABELS, POST_REPORT_RESOLUTION_LABELS } from "@/domains/posts/shared/postReportReasons";
import type { PostReportResolution } from "@/database/schema";
import { Button, Text, Textarea } from "@mantine/core";
import { IconCheck, IconExternalLink, IconFlag, IconLock, IconPencilOff } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

type PostReportCardProps<T extends PostReportRowResource> = {
  row: StrictResource<T, PostReportRowResource>,
  // Свой пост модератор не разбирает — карточка без кнопок
  own: boolean
}

/*
  Карточка жалоб на пост (спека 36), по образцу CommentReportCard: коралловая шапка (сколько
  жалоб, кто, когда последняя), пост с автором и статусом, жалобщики с причиной и комментарием,
  действия «Заблокировать пост» (с причиной — её увидит автор) и «Оставить». Рассмотренная —
  без действий, с итогом в шапке
*/
export default function PostReportCard<T extends PostReportRowResource>({ row, own }: PostReportCardProps<T>) {
  const router = useRouter();
  const [ blocking, setBlocking ] = useState(false);
  const [ reason, setReason ] = useState('');
  const onSuccess = () => {
    setBlocking(false);
    router.refresh();
  };
  const block = useAction(blockReportedPostAction.bind(null, row.postId), { onSuccess });
  const keep = useAction(keepReportedPostAction.bind(null, row.postId), { onSuccess });
  const error = block.result.serverError ?? keep.result.serverError;
  const count = row.reporters.length;
  const open = row.resolution === null;

  return (
    <article className="ui-report-card ui-post-report" data-resolved={!open}>
      <header className="ui-report-card__head">
        <IconFlag size={15} stroke={2} />
        <b>{ count } { plural(count, [ 'жалоба', 'жалобы', 'жалоб' ]) }</b>
        <span className="ui-report-card__who">
          { row.reporters.map(r => r.name).join(', ') }
          { open && <> · { count > 1 ? 'последняя ' : '' }<LocalDate value={row.lastAt} relative /></> }
        </span>
        { row.resolution && <span className="ui-report-card__outcome" data-kind={row.resolution.kind}>
          { OUTCOME_ICONS[row.resolution.kind] }
          { POST_REPORT_RESOLUTION_LABELS[row.resolution.kind] }
          { row.resolution.by && <> · { row.resolution.by }</> }
          <span className="ui-report-card__outcome-when"> · <LocalDate value={row.resolution.at} options={{ day: 'numeric', month: 'short' }} /></span>
        </span> }
      </header>

      <div className="ui-report-card__comment">
        <UserAvatar name={row.author.name} avatarKey={row.author.avatarKey} size={40} />
        <div className="ui-report-card__body">
          <Link href={`/office/moderation/posts/${row.postId}`} className="ui-post-report__title">«{ row.title }»</Link>
          <div className="ui-post-report__meta">
            <span>{ row.author.name }</span>
            <PostStatusTag status={row.status} />
            { row.status === 'published' && <Link href={`/posts/${row.postId}`} className="ui-post-report__site">
              <IconExternalLink size={13} stroke={2} />Открыть на сайте
            </Link> }
          </div>
        </div>
      </div>

      <ul className="ui-post-report__reporters">
        { row.reporters.map(r => (
          <li key={r.id}>
            <div className="ui-post-report__reporter">
              <b>{ r.name }</b>
              <span className="ui-post-report__reason">{ POST_REPORT_REASON_LABELS[r.reason] }</span>
              <span className="ui-post-report__at"><LocalDate value={r.at} relative /></span>
            </div>
            { r.comment && <p className="ui-post-report__comment">{ r.comment }</p> }
          </li>
        )) }
      </ul>

      { open && own && <p className="ui-report-card__note">Ваш пост — разберёт другой модератор.</p> }

      { open && !own && blocking && <form className="ui-report-card__form ui-report-card__actions" onSubmit={e => { e.preventDefault(); block.execute({ comment: reason }) }}>
        <Textarea
          label="Причина блокировки"
          description="Обязательна — автор увидит её в кабинете. Пост пропадёт из ленты"
          value={reason}
          onChange={e => setReason(e.target.value)}
          error={fieldError(block.result.validationErrors, 'comment')}
          autosize
          minRows={2}
          autoFocus
        />
        <div className="ui-report-card__buttons">
          <Button type="submit" size="sm" className="ui-ink-button" leftSection={<IconLock size={15} stroke={1.8} />} loading={block.isPending}>Заблокировать</Button>
          <Button size="sm" variant="subtle" color="gray" onClick={() => setBlocking(false)}>Отмена</Button>
        </div>
      </form> }

      { open && !own && !blocking && <div className="ui-report-card__actions">
        <Button size="sm" className="ui-ink-button" leftSection={<IconLock size={15} stroke={1.8} />} onClick={() => setBlocking(true)}>
          Заблокировать<span className="ui-report-card__desktop">&nbsp;пост</span>
        </Button>
        <Button size="sm" variant="default" loading={keep.isPending} onClick={() => keep.execute()}>Оставить</Button>
      </div> }

      { error && <Text size="sm" c="red" className="ui-report-card__error">{ error.message }</Text> }
    </article>
  );
}

const OUTCOME_ICONS: Record<PostReportResolution, ReactNode> = {
  blocked: <IconLock size={14} stroke={2} />,
  kept: <IconCheck size={14} stroke={2} />,
  withdrawn: <IconPencilOff size={14} stroke={2} />
};
