'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import type { OfficeCommentListResource } from "@/domains/comments/dto/commentResources";
import type { OfficeCommentTab } from "@/domains/comments/dto/commentRequests";
import { loadOfficeCommentsAction } from "@/domains/comments/actions/commentActions";
import OfficeCommentCard from "@/domains/comments/components/OfficeCommentCard";
import { Button, Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type OfficeCommentListProps<T extends OfficeCommentListResource> = {
  tab: OfficeCommentTab,
  initial: StrictResource<T, OfficeCommentListResource>,
  hasMore: boolean
}

// Первая порция — с сервера, следующие — по курсору id последней строки
export default function OfficeCommentList<T extends OfficeCommentListResource>({ tab, initial, hasMore: initialHasMore }: OfficeCommentListProps<T>) {
  const [ items, setItems ] = useState<OfficeCommentListResource>(initial);
  const [ hasMore, setHasMore ] = useState(initialHasMore);
  const load = useAction(loadOfficeCommentsAction, {
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
    <div className="ui-office-comments">
      { items.map(comment => <OfficeCommentCard key={comment.id} comment={comment} />) }
    </div>
    { hasMore && <div className="ui-feed-more">
      { failed && !load.isPending && <Text size="sm" c="dimmed">Не удалось загрузить комментарии.</Text> }
      <Button variant="default" loading={load.isPending} onClick={() => load.execute({ tab, beforeId: items[items.length - 1].id })}>
        { failed ? 'Повторить' : 'Показать ещё' }
      </Button>
    </div> }
  </>
}
