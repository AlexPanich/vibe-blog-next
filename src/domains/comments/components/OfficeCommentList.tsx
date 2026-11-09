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
  hasMore: boolean,
  // Прежняя отметка «К моим постам», мс (спека 43): позже — «Новый», null — новые все; у «Моих» не передаётся
  newSince?: number | null
}

/*
  Первая порция — с сервера, следующие — по курсору id последней строки. «Новый» считается здесь
  по прежней отметке: в БД она уже обновлена, а «Показать ещё» размечает порции так же
*/
export default function OfficeCommentList<T extends OfficeCommentListResource>({ tab, initial, hasMore: initialHasMore, newSince }: OfficeCommentListProps<T>) {
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
      { items.map(comment => <OfficeCommentCard
        key={comment.id}
        comment={comment}
        isNew={newSince !== undefined && (newSince === null || comment.createdAt.getTime() > newSince)}
      />) }
    </div>
    { hasMore && <div className="ui-feed-more">
      { failed && !load.isPending && <Text size="sm" c="dimmed">Не удалось загрузить комментарии.</Text> }
      <Button variant="default" loading={load.isPending} onClick={() => load.execute({ tab, beforeId: items[items.length - 1].id })}>
        { failed ? 'Повторить' : 'Показать ещё' }
      </Button>
    </div> }
  </>
}
