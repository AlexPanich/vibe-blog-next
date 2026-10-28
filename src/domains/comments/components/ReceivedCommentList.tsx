'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import type { ReceivedCommentListResource } from "@/domains/comments/dto/commentResources";
import { loadReceivedCommentsAction } from "@/domains/comments/actions/commentActions";
import ReceivedCommentRow from "@/domains/comments/components/ReceivedCommentRow";
import { Button, Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type ReceivedCommentListProps<T extends ReceivedCommentListResource> = {
  initial: StrictResource<T, ReceivedCommentListResource>,
  hasMore: boolean
}

// Первая порция — с сервера, следующие — по курсору id последней строки
export default function ReceivedCommentList<T extends ReceivedCommentListResource>({ initial, hasMore: initialHasMore }: ReceivedCommentListProps<T>) {
  const [ items, setItems ] = useState<ReceivedCommentListResource>(initial);
  const [ hasMore, setHasMore ] = useState(initialHasMore);
  const load = useAction(loadReceivedCommentsAction, {
    onSuccess: ({ data }) => {
      setHasMore(data.hasMore);
      setItems(prev => {
        // Двойной клик или повтор после ошибки — дубли отбрасываем
        const seen = new Set(prev.map(c => c.id));
        return [ ...prev, ...data.items.filter(c => !seen.has(c.id)) ];
      });
    }
  });
  const failed = !!load.result.serverError || !!load.result.validationErrors;

  return <>
    <div className="ui-rows">
      { items.map(comment => <ReceivedCommentRow key={comment.id} comment={comment} />) }
    </div>
    { hasMore && <div className="ui-feed-more">
      { failed && !load.isPending && <Text size="sm" c="dimmed">Не удалось загрузить комментарии.</Text> }
      <Button variant="default" loading={load.isPending} onClick={() => load.execute({ beforeId: items[items.length - 1].id })}>
        { failed ? 'Повторить' : 'Показать ещё' }
      </Button>
    </div> }
  </>
}
