'use client'

import 'client-only';
import useLiveEvent from "@/hooks/useLiveEvent";
import { Button } from "@mantine/core";
import { useState } from "react";

type FeedNewPostsProps = {
  // Перечитать первую порцию; false — не удалось, плашка остаётся
  onShow: () => Promise<boolean>
}

/*
  Плашка «Новые посты (N)» над «чистой» лентой. Копит id из post.published: повтор не
  считается. Сама подписка открывает гостю живой канал, поэтому компонент рендерится только
  там, где плашка нужна
*/
export default function FeedNewPosts({ onShow }: FeedNewPostsProps){
  const [ ids, setIds ] = useState<ReadonlySet<number>>(new Set());
  const [ pending, setPending ] = useState(false);

  useLiveEvent('post.published', ({ postId }) => {
    setIds(prev => prev.has(postId) ? prev : new Set(prev).add(postId));
  });

  const show = async () => {
    setPending(true);

    if(await onShow()){
      setIds(new Set());
    }

    setPending(false);
  };

  return <div className="ui-feed-fresh" aria-live="polite">
    { ids.size > 0 && <div className="ui-feed-fresh__bar">
      <span>Новые посты ({ ids.size })</span>
      <Button size="compact-sm" onClick={show} loading={pending}>Показать</Button>
    </div> }
  </div>
}
