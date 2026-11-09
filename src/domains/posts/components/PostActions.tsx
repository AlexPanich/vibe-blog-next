'use client'

import 'client-only';
import { togglePostFavoriteAction } from "@/domains/posts/actions/postFavoriteActions";
import { loadPostViewerAction } from "@/domains/posts/actions/postViewerActions";
import type { PostReportState } from "@/domains/posts/dto/postResources";
import { reportPost } from "@/domains/posts/policy";
import useUser from "@/hooks/useUser";
import Link from "@/components/general/Link";
import { Menu, MenuDropdown, MenuItem, MenuTarget, Text } from "@mantine/core";
import { IconBookmark, IconBookmarkFilled, IconCheck, IconDots, IconFlag } from "@tabler/icons-react";
import ShareButton from "@/domains/posts/components/ShareButton";
import PostReportDialog from "@/domains/posts/components/PostReportDialog";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";

type PostActionsProps = {
  id: number,
  title: string,
  authorId: number
}

/*
  Избранное, «поделиться» и «пожаловаться» на странице поста (спеки 30, 36). Один компонент
  рисует и ряд под текстом (широкий экран), и закреплённую снизу панель телефона — у них общее
  состояние закладки и жалобы; на телефоне жалоба — в меню «…». Панель position: fixed, поэтому её место в разметке не важно; CSS прячет
  нижние вкладки, пока она на странице
*/
export default function PostActions({ id, title, authorId }: PostActionsProps) {
  const { user, ready } = useUser();
  const [ favorite, setFavorite ] = useState<boolean | null>(null);
  const [ report, setReport ] = useState<PostReportState | null>(null);
  const [ reporting, setReporting ] = useState(false);
  const toggle = useAction(togglePostFavoriteAction.bind(null, id), { onSuccess: ({ data }) => setFavorite(data.favorite) });
  const load = useAction(loadPostViewerAction.bind(null, id), {
    onSuccess: ({ data }) => {
      setFavorite(data.favorite);
      setReport(data.report);
    }
  });
  const { execute: loadMine } = load;
  // execute меняется на каждом рендере — без метки эффект запрашивал бы по кругу
  const loadedFor = useRef<number | null>(null);

  useEffect(() => {
    if(ready && user && loadedFor.current !== user.id){
      loadedFor.current = user.id;
      loadMine();
    }
  }, [ ready, user, loadMine ]);

  // После выхода в той же вкладке закладку прежнего пользователя не показываем
  const marked = ready && user ? favorite === true : false;
  const busy = toggle.isPending || (ready && !!user && favorite === null && !load.hasErrored);
  const label = marked ? 'В избранном' : 'В избранное';
  const Icon = marked ? IconBookmarkFilled : IconBookmark;
  const error = toggle.result.serverError ?? load.result.serverError;
  // Гостю, автору и до гидрации кнопки нет: сервер не знает, кто смотрит (спека 36, п. 8)
  const canReport = ready && !!user && reportPost(user, { userId: authorId, status: 'published' });
  const reportDone = report === 'sent' || report === 'resolved';
  const reportLabel = REPORT_LABELS[report ?? 'none'];
  const ReportIcon = report === 'resolved' ? IconCheck : IconFlag;

  function favoriteControl(className: string, withLabel: boolean){
    const body = <><Icon size={withLabel ? 17 : 19} stroke={1.8} />{ withLabel && <span>{ label }</span> }</>;

    // Гостю и до гидрации — ссылка на вход: сервер не знает, кто смотрит
    if(!ready || !user){
      return <Link href="/auth/login" className={className} aria-label={withLabel ? undefined : 'Войти, чтобы добавить в избранное'}>{ body }</Link>;
    }

    return (
      <button
        type="button"
        className={className}
        data-active={marked || undefined}
        aria-pressed={marked}
        aria-label={withLabel ? undefined : label}
        disabled={busy}
        onClick={() => toggle.execute({ favorite: !marked })}
      >
        { body }
      </button>
    );
  }

  return <>
    <div className="ui-post-actions">
      { favoriteControl('ui-pill ui-pill--favorite', true) }
      <ShareButton title={title} />
      { canReport && <button
        type="button"
        className="ui-pill ui-pill--outline ui-pill--report"
        disabled={reportDone || report === null}
        onClick={() => setReporting(true)}
      >
        <ReportIcon size={17} stroke={1.8} /><span>{ reportLabel }</span>
      </button> }
    </div>
    { error && <Text size="sm" c="red">{ error.message }</Text> }

    <div className="ui-post-bar">
      { ready && user
        ? <button type="button" className="ui-post-bar__input" onClick={focusCommentForm}>Написать комментарий…</button>
        : <Link href="/auth/login" className="ui-post-bar__input">Войдите, чтобы комментировать</Link> }
      { favoriteControl('ui-pill ui-pill--icon ui-pill--favorite', false) }
      <ShareButton title={title} iconSize={19} />
      { canReport && <Menu position="top-end" withinPortal>
        <MenuTarget>
          <button type="button" className="ui-pill ui-pill--icon" aria-label="Ещё" title="Ещё">
            <IconDots size={19} stroke={1.8} />
          </button>
        </MenuTarget>
        <MenuDropdown>
          <MenuItem
            leftSection={<ReportIcon size={16} stroke={1.8} />}
            disabled={reportDone || report === null}
            onClick={() => setReporting(true)}
          >
            { reportLabel }
          </MenuItem>
        </MenuDropdown>
      </Menu> }
    </div>

    { canReport && <PostReportDialog
      postId={id}
      title={title}
      opened={reporting}
      onClose={() => setReporting(false)}
      onSent={setReport}
    /> }
  </>
}

const REPORT_LABELS: Record<PostReportState, string> = {
  none: 'Пожаловаться',
  sent: 'Жалоба отправлена',
  resolved: 'Жалоба рассмотрена',
};

// Поле комментария — в блоке комментариев (CommentsBlock, id comment-composer)
function focusCommentForm(){
  const field = document.querySelector<HTMLTextAreaElement>('#comment-composer textarea');

  field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  field?.focus({ preventScroll: true });
}
