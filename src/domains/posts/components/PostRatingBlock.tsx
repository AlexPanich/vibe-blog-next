'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { PostRatingBlockResource } from "@/domains/posts/dto/postResources";
import { myPostRatingAction, ratePostAction } from "@/domains/posts/actions/postRatingActions";
import { formatRating, ratingsCountLabel } from "@/domains/posts/shared/formatRating";
import useLiveEvent from "@/hooks/useLiveEvent";
import useLiveTopic from "@/hooks/useLiveTopic";
import useUser from "@/hooks/useUser";
import { postTopic } from "@/shared/liveEvents";
import { Anchor, Group, Rating, Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useEffect, useRef, useState } from "react";

type PostRatingBlockProps<T extends PostRatingBlockResource> = {
  post: StrictResource<T, PostRatingBlockResource>
}

// Оценка поста. Средняя приходит с сервера и дальше — из живого канала (спека 29), своя —
// отдельным запросом после гидрации: публичная страница сессию на сервере не читает.
export default function PostRatingBlock<T extends PostRatingBlockResource>({ post }: PostRatingBlockProps<T>) {
  const { user, ready } = useUser();
  const [ stats, setStats ] = useState(post.rating);
  const [ mine, setMine ] = useState(0);
  const own = user?.id === post.userId;
  const rate = useAction(ratePostAction.bind(null, post.id), {
    onSuccess: ({ data }) => { setStats({ average: data.average, count: data.count }); setMine(data.mine) }
  });
  const load = useAction(myPostRatingAction.bind(null, post.id), {
    onSuccess: ({ data }) => setMine(data.mine)
  });
  const { execute: loadMine } = load;
  // execute из useAction меняется на каждом рендере: без этой метки эффект запрашивал бы оценку по кругу
  const loadedFor = useRef<number | null>(null);

  useLiveTopic(postTopic(post.id));

  useLiveEvent('post.rating', data => {
    if(data.postId === post.id){
      setStats({ average: data.average, count: data.count });
    }
  });

  useEffect(() => {
    if(ready && user && !own && loadedFor.current !== user.id){
      loadedFor.current = user.id;
      loadMine();
    }
  }, [ ready, user, own, loadMine ]);

  return (
    <div className="ui-rating">
      <p className="ui-kicker">Оценка</p>
      <Group gap="md" align="center">
        { ready && user && !own && <Rating
          value={mine}
          onChange={value => rate.execute({ value })}
          readOnly={rate.isPending}
          aria-label="Ваша оценка"
        /> }
        <Text size="sm" c="dimmed">
          { stats.count > 0 && stats.average !== null
            ? `${formatRating(stats.average)} · ${ratingsCountLabel(stats.count)}`
            : 'Нет оценок' }
        </Text>
        { ready && user && !own && mine > 0 && <Anchor component="button" size="sm" onClick={() => rate.execute({ value: 0 })}>
          Снять оценку
        </Anchor> }
      </Group>
      { ready && !user && <Text size="sm" mt={6}><Link href="/auth/login">Войдите</Link>, чтобы оценить пост.</Text> }
      { ready && own && <Text size="sm" c="dimmed" mt={6}>Свой пост оценить нельзя.</Text> }
      { rate.result.serverError && <Text size="sm" c="red" mt={6}>{ rate.result.serverError.message }</Text> }
    </div>
  );
}
