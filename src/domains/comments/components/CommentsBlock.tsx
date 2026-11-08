'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { loadCommentsAction, loadCommentViewerAction } from "@/domains/comments/actions/commentActions";
import type { CommentListResource, CommentReportState, CommentViewer } from "@/domains/comments/dto/commentResources";
import CommentForm from "@/domains/comments/components/CommentForm";
import CommentItem from "@/domains/comments/components/CommentItem";
import { CommentsContext } from "@/domains/comments/components/commentsContext";
import { buildCommentTree, commentsCountLabel } from "@/domains/comments/shared/commentTree";
import useLiveEvent from "@/hooks/useLiveEvent";
import useLiveTopic from "@/hooks/useLiveTopic";
import useUser from "@/hooks/useUser";
import { postTopic } from "@/shared/liveEvents";
import { Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useEffect, useMemo, useRef, useState } from "react";

type CommentsBlockProps<T extends CommentListResource> = {
  postId: number,
  // Ветка картинки галереи; без него — комментарии к посту
  imageId?: number | null,
  postAuthorId: number,
  // Заголовок блока: у фото — «Комментарии к фото»
  title?: string,
  comments: StrictResource<T, CommentListResource>
}

const EMPTY_VIEWER: CommentViewer = { myReactions: {}, hidden: {}, reports: {}, blocking: [], blockedWith: [] };

// Серия событий (ответ + реакции) — одно перечитывание
const RELOAD_DELAY_MS = 300;

/*
  Комментарии поста. Дерево приходит с сервера без скрытых текстов, «своё» (реакции, свои
  скрытые, модератору — все скрытые) догружается после гидрации, как своя оценка поста.
  Живая (спека 29): по post.comments.changed ветка и «своё» перечитываются, по
  comment.reactions меняются счётчики
*/
export default function CommentsBlock<T extends CommentListResource>({ postId, imageId = null, postAuthorId, title = 'Комментарии', comments }: CommentsBlockProps<T>) {
  const { user, ready } = useUser();
  const [ viewer, setViewer ] = useState<CommentViewer>(EMPTY_VIEWER);
  /*
    Ветка из живого канала. source — props, на которых она получена: новые props (revalidate
    после своего действия) свежее, и живая копия отбрасывается
  */
  const [ live, setLive ] = useState<{ source: CommentListResource, list: CommentListResource } | null>(null);
  const list: CommentListResource = live && live.source === comments ? live.list : comments;
  const tree = useMemo(() => buildCommentTree(list), [ list ]);
  const count = list.filter(c => c.state !== 'deleted').length;
  const load = useAction(loadCommentViewerAction.bind(null, postId, imageId), { onSuccess: ({ data }) => setViewer(data) });
  const reload = useAction(loadCommentsAction.bind(null, postId, imageId), { onSuccess: ({ data }) => setLive({ source: comments, list: data }) });
  const { execute: loadViewer } = load;
  // execute из useAction меняется на каждом рендере: без метки эффект грузил бы по кругу
  const loadedFor = useRef<number | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Первый open — подключение при загрузке страницы, данные и так свежие
  const opened = useRef(false);

  function scheduleReload(){
    if(reloadTimer.current){
      clearTimeout(reloadTimer.current);
    }

    reloadTimer.current = setTimeout(() => {
      reloadTimer.current = null;
      reload.execute();

      // Новый автор в ветке (блокировки), новый скрытый (текст модератору) — «своё» тоже
      if(user){
        load.execute();
      }
    }, RELOAD_DELAY_MS);
  }

  useLiveTopic(postTopic(postId));

  useLiveEvent('post.comments.changed', data => {
    if(data.postId === postId && data.imageId === imageId){
      scheduleReload();
    }
  });

  useLiveEvent('comment.reactions', ({ commentId, likes, dislikes }) => {
    setLive(prev => {
      const base = prev && prev.source === comments ? prev.list : comments;

      return base.some(c => c.id === commentId)
        ? { source: comments, list: base.map(c => c.id === commentId ? { ...c, likes, dislikes } : c) }
        : prev;
    });
  });

  // Переподключение: события из разрыва потеряны
  useLiveEvent('open', () => {
    if(opened.current){
      scheduleReload();
    }

    opened.current = true;
  });

  useEffect(() => () => {
    if(reloadTimer.current){
      clearTimeout(reloadTimer.current);
    }
  }, []);

  useEffect(() => {
    if(ready && user && loadedFor.current !== user.id){
      loadedFor.current = user.id;
      loadViewer();
    }
  }, [ ready, user, loadViewer ]);

  const context = {
    postId,
    imageId,
    postAuthorId,
    user: ready ? user : null,
    // После выхода в той же вкладке «своё» прежнего пользователя не показываем
    viewer: ready && user ? viewer : EMPTY_VIEWER,
    viewerLoaded: load.hasSucceeded,
    setReaction: (id: number, mine: 1 | -1 | 0) => setViewer(prev => ({ ...prev, myReactions: withKey(prev.myReactions, id, mine === 0 ? undefined : mine) })),
    setHidden: (id: number, hidden: { content: string, reason: string } | null) => setViewer(prev => ({ ...prev, hidden: withKey(prev.hidden, id, hidden ?? undefined) })),
    setReport: (id: number, state: CommentReportState) => setViewer(prev => ({ ...prev, reports: withKey(prev.reports, id, state) }))
  };

  return (
    <CommentsContext value={context}>
      <section className="ui-comments" aria-label="Комментарии">
        <h2 className="ui-comments__title">
          { title }{ count > 0 && <span className="ui-comments__count">{ count }</span> }
        </h2>

        { ready && user && (viewer.blockedWith.includes(postAuthorId)
          ? <Text size="sm" c="dimmed">Комментировать нельзя: между вами и автором поста блокировка.</Text>
          : <CommentForm target={{ postId, imageId }} submitLabel="Отправить" placeholder="Поделитесь мыслями — автор читает всё" composer={user} />) }
        { ready && !user && <Text size="sm"><Link href="/auth/login">Войдите</Link>, чтобы комментировать.</Text> }

        { tree.length === 0
          ? <Text size="sm" c="dimmed" mt="sm">Комментариев пока нет.</Text>
          : <div className="ui-comments__list" aria-label={commentsCountLabel(count)}>
            { tree.map(node => <CommentItem key={node.id} node={node} depth={0} ancestorAuthorIds={[]} />) }
          </div> }
      </section>
    </CommentsContext>
  );
}

function withKey<V>(record: Record<number, V>, id: number, value: V | undefined): Record<number, V> {
  const next = { ...record };

  if(value === undefined){
    delete next[id];
  }
  else{
    next[id] = value;
  }

  return next;
}
