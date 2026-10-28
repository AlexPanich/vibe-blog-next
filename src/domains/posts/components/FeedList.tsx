'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { PostListResource } from "@/domains/posts/dto/postResources";
import { FEED_MAX_LIMIT, FEED_PAGE, PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { loadFeedAction } from "@/domains/posts/actions/postFeedActions";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import PostCard from "@/domains/posts/components/PostCard";
import FeedNewPosts from "@/domains/posts/components/FeedNewPosts";
import { Button, Loader, Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type FeedListProps<T extends PostListResource> = {
  initial: StrictResource<T, PostListResource>,
  total: number,
  filter: PostFeedFilterDto,
  // Плашка «Новые посты» — только в «чистой» ленте (isPlainFeed)
  live?: boolean
}

// Бесконечная лента. Первая порция приходит с сервера, следующие — loadFeedAction, когда
// полоса в конце списка попадает в экран. Сколько загружено — в URL (?limit=), чтобы
// «назад» из поста возвращал к тому же месту. Сброс при смене условий — key на странице.
export default function FeedList<T extends PostListResource>({ initial, total: initialTotal, filter, live = false }: FeedListProps<T>) {
  const [ posts, setPosts ] = useState<PostListResource>(initial);
  const [ total, setTotal ] = useState(initialTotal);
  const sentinel = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLParagraphElement>(null);
  const router = useRouter();
  const action = useAction(loadFeedAction, {
    onSuccess: ({ data }) => {
      setTotal(data.total);
      setPosts(prev => {
        // Между порциями могли опубликовать пост — смещение сдвинулось, дубли отбрасываем
        const seen = new Set(prev.map(p => p.id));
        return [ ...prev, ...data.posts.filter(p => !seen.has(p.id)) ];
      });
    }
  });
  // Своё состояние, а не action.result: ошибка обновления не должна прятать догрузку
  const refresh = useAction(loadFeedAction);
  const hasMore = posts.length < total;
  const failed = !!action.result.serverError || !!action.result.validationErrors;
  const { execute, isPending } = action;
  // limit в схеме action нет — zod его отбросит
  const loadMore = () => execute({ filter, offset: posts.length });

  /*
    «Показать» из плашки: первая порция заменяет список, а не дописывается в начало —
    иначе разошлись бы «Показано N из M» и смещение догрузки. Перезагрузка страницы не
    годится: key списка от limit не зависит, и новый initial состояние не сбросит
  */
  const showFresh = async () => {
    const { data } = await refresh.executeAsync({ filter, offset: 0 });

    if(!data){
      return false;
    }

    setPosts(data.posts);
    setTotal(data.total);
    router.replace(feedUrl({ ...filter, limit: FEED_PAGE }), { scroll: false });
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    return true;
  };

  /*
    Догрузили — обновляем URL без записи в истории. router.replace, а не history.replaceState:
    по «назад» Next берёт дерево из своего кэша, и там должна быть уже вся загруженная лента,
    а не первая порция. Состояние не сбрасывается — key списка от limit не зависит
  */
  const limit = Math.min(FEED_MAX_LIMIT, Math.ceil(posts.length / FEED_PAGE) * FEED_PAGE);

  useEffect(() => {
    if(limit > filter.limit){
      router.replace(feedUrl({ ...filter, limit }), { scroll: false });
    }
  }, [ limit, filter, router ]);

  useEffect(() => {
    const target = sentinel.current;

    if(!target || !hasMore || isPending || failed){
      return;
    }

    const observer = new IntersectionObserver(entries => {
      if(entries.some(entry => entry.isIntersecting)){
        loadMore();
      }
    }, { rootMargin: '400px' });

    observer.observe(target);

    return () => observer.disconnect();
  });

  return <>
    { live && <FeedNewPosts onShow={showFresh} /> }
    <p ref={top} className="ui-meta ui-feed-count" aria-live="polite">
      { filter.search ? `Найдено: ${total}. ` : '' }Показано { posts.length } из { total }
    </p>
    <div className="ui-grid">
      { posts.map(post => <PostCard key={post.id} post={post} />) }
    </div>
    { hasMore && <div ref={sentinel} className="ui-feed-more">
      { isPending && <Loader size="sm" /> }
      { failed && !isPending && <>
        <Text size="sm" c="dimmed">Не удалось загрузить посты.</Text>
        <Button size="compact-sm" variant="default" onClick={loadMore}>
          Повторить
        </Button>
      </> }
    </div> }
  </>
}
