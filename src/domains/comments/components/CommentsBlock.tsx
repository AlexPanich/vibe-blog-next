'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { loadCommentViewerAction } from "@/domains/comments/actions/commentActions";
import type { CommentListResource, CommentReportState, CommentViewer } from "@/domains/comments/dto/commentResources";
import CommentForm from "@/domains/comments/components/CommentForm";
import CommentItem from "@/domains/comments/components/CommentItem";
import { CommentsContext } from "@/domains/comments/components/commentsContext";
import { buildCommentTree, commentsCountLabel } from "@/domains/comments/shared/commentTree";
import useUser from "@/hooks/useUser";
import { Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useEffect, useMemo, useRef, useState } from "react";

type CommentsBlockProps<T extends CommentListResource> = {
  postId: number,
  // Ветка картинки галереи; без него — комментарии к посту
  imageId?: number | null,
  postAuthorId: number,
  comments: StrictResource<T, CommentListResource>
}

const EMPTY_VIEWER: CommentViewer = { myReactions: {}, hidden: {}, reports: {}, blocking: [], blockedWith: [] };

/*
  Комментарии поста. Дерево приходит с сервера без скрытых текстов, «своё» (реакции, свои
  скрытые, модератору — все скрытые) догружается после гидрации, как своя оценка поста
*/
export default function CommentsBlock<T extends CommentListResource>({ postId, imageId = null, postAuthorId, comments }: CommentsBlockProps<T>) {
  const { user, ready } = useUser();
  const [ viewer, setViewer ] = useState<CommentViewer>(EMPTY_VIEWER);
  const tree = useMemo(() => buildCommentTree(comments), [ comments ]);
  const count = comments.filter(c => c.state !== 'deleted').length;
  const load = useAction(loadCommentViewerAction.bind(null, postId, imageId), { onSuccess: ({ data }) => setViewer(data) });
  const { execute: loadViewer } = load;
  // execute из useAction меняется на каждом рендере: без метки эффект грузил бы по кругу
  const loadedFor = useRef<number | null>(null);

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
    viewer,
    viewerLoaded: load.hasSucceeded,
    setReaction: (id: number, mine: 1 | -1 | 0) => setViewer(prev => ({ ...prev, myReactions: withKey(prev.myReactions, id, mine === 0 ? undefined : mine) })),
    setHidden: (id: number, hidden: { content: string, reason: string } | null) => setViewer(prev => ({ ...prev, hidden: withKey(prev.hidden, id, hidden ?? undefined) })),
    setReport: (id: number, state: CommentReportState) => setViewer(prev => ({ ...prev, reports: withKey(prev.reports, id, state) }))
  };

  return (
    <CommentsContext value={context}>
      <section className="ui-comments" aria-label="Комментарии">
        <p className="ui-kicker">Комментарии{ count > 0 ? ` · ${count}` : '' }</p>

        { ready && user && (viewer.blockedWith.includes(postAuthorId)
          ? <Text size="sm" c="dimmed">Комментировать нельзя: между вами и автором поста блокировка.</Text>
          : <CommentForm target={{ postId, imageId }} submitLabel="Отправить" placeholder="Ваш комментарий" />) }
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
