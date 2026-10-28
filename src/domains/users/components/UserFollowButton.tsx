'use client'

import 'client-only';
import { followUserAction, myUserFollowAction } from "@/domains/users/actions/userFollowActions";
import useLiveEvent from "@/hooks/useLiveEvent";
import useLiveTopic from "@/hooks/useLiveTopic";
import useUser from "@/hooks/useUser";
import { userTopic } from "@/shared/liveEvents";
import { Button, Group, Text } from "@mantine/core";
import { IconHeartHandshake, IconUserCheck, IconUserPlus, IconUsers } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useEffect, useRef, useState } from "react";

type UserFollowButtonProps = {
  authorId: number,
  // С сервера — на странице автора; без него счётчик не рисуется (страница поста)
  followersCount?: number,
  // Подпись кнопки: на странице поста — с именем автора
  authorName?: string
}

// blocked — между нами блокировка (спека 26): подписки нет и быть не может
type FollowState = { following: boolean, friend: boolean, blocked: boolean, followersCount: number }

// Подписка на автора. Своё состояние — после гидрации: публичная страница сессию на сервере не читает.
// Число подписчиков — живое (спека 29), у всех, кто смотрит автора.
export default function UserFollowButton({ authorId, followersCount, authorName }: UserFollowButtonProps) {
  const { user, ready } = useUser();
  const [ loadedState, setState ] = useState<FollowState | null>(null);
  // После выхода в той же вкладке состояние прежнего пользователя не показываем
  const state = ready && user ? loadedState : null;
  // Из живого канала — свежее и props, и ответа своего действия
  const [ liveCount, setLiveCount ] = useState<number | null>(null);
  const toggle = useAction(followUserAction.bind(null, authorId), { onSuccess: ({ data }) => { setState(data); setLiveCount(data.followersCount) } });
  const load = useAction(myUserFollowAction.bind(null, authorId), { onSuccess: ({ data }) => setState(data) });
  const { execute: loadMine } = load;
  // execute меняется на каждом рендере — без метки эффект запрашивал бы по кругу
  const loadedFor = useRef<number | null>(null);
  const own = ready && user?.id === authorId;

  useLiveTopic(userTopic(authorId));

  useLiveEvent('user.followers', data => {
    if(data.userId === authorId){
      setLiveCount(data.followersCount);
    }
  });

  useEffect(() => {
    if(ready && user && !own && loadedFor.current !== user.id){
      loadedFor.current = user.id;
      loadMine();
    }
  }, [ ready, user, own, loadMine ]);

  // Где числа нет с сервера (страница поста) и «своё» не пришло — его нет и в живом канале
  const known = followersCount !== undefined || state !== null;
  const count = known ? liveCount ?? state?.followersCount ?? followersCount : undefined;
  const label = authorName ? ` на ${authorName}` : '';

  return (
    <Group gap="sm" className="ui-follow">
      { count !== undefined && <span className="ui-meta__item"><IconUsers size={14} stroke={1.8} />Подписчиков: { count }</span> }
      { state?.friend && <span className="ui-tag ui-tag--friend"><IconHeartHandshake size={13} stroke={1.8} />Ваш друг</span> }
      { ready && !user && <Text size="sm"><Link href="/auth/login">Войдите</Link>, чтобы подписаться{ label }.</Text> }
      { ready && user && !own && !state?.blocked && <Button
        size={authorName ? 'sm' : 'compact-sm'}
        variant={state?.following ? 'default' : 'light'}
        leftSection={state?.following ? <IconUserCheck size={16} /> : <IconUserPlus size={16} />}
        loading={toggle.isPending || (state === null && !load.hasErrored)}
        onClick={() => toggle.execute({ follow: !state?.following })}
      >
        { state?.following ? 'Отписаться' : `Подписаться${label}` }
      </Button> }
      { toggle.result.serverError && <Text size="sm" c="red">{ toggle.result.serverError.message }</Text> }
      { ready && user && load.result.serverError && <Text size="sm" c="red">{ load.result.serverError.message }</Text> }
    </Group>
  );
}
