'use client'

import 'client-only';
import { followUserAction, myUserFollowAction } from "@/domains/users/actions/userFollowActions";
import useUser from "@/hooks/useUser";
import { Text } from "@mantine/core";
import { IconUserCheck, IconUserPlus, IconUsers } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useEffect, useRef, useState } from "react";

// blocked — между нами блокировка (спека 26): подписки нет и быть не может
type FollowState = { following: boolean, friend: boolean, blocked: boolean, followersCount: number }

/*
  Подписка на автора — пилюля (спека 30): страница поста, плитка на главной, профиль; цвет
  задаёт место. Гостю — ссылка на вход, себе и при блокировке — ничего. Своё состояние —
  после гидрации: публичная страница сессию на сервере не читает. Число подписчиков —
  отдельно, UserFollowersCount. withFriend — профиль: при взаимной подписке рядом пометка
  «Ваш друг». Подпись — в .ui-pill__label: место может оставить одну иконку (список авторов
  на телефоне), aria-label тогда не нужен — текст лишь скрыт визуально
*/
export default function UserFollowButton({ authorId, withFriend = false }: { authorId: number, withFriend?: boolean }) {
  const { user, ready } = useUser();
  const [ loadedState, setState ] = useState<FollowState | null>(null);
  // После выхода в той же вкладке состояние прежнего пользователя не показываем
  const state = ready && user ? loadedState : null;
  const toggle = useAction(followUserAction.bind(null, authorId), { onSuccess: ({ data }) => setState(data) });
  const load = useAction(myUserFollowAction.bind(null, authorId), { onSuccess: ({ data }) => setState(data) });
  const { execute: loadMine } = load;
  // execute меняется на каждом рендере — без метки эффект запрашивал бы по кругу
  const loadedFor = useRef<number | null>(null);
  const own = ready && user?.id === authorId;

  useEffect(() => {
    if(ready && user && !own && loadedFor.current !== user.id){
      loadedFor.current = user.id;
      loadMine();
    }
  }, [ ready, user, own, loadMine ]);

  const followError = toggle.result.serverError ?? load.result.serverError;

  if(!ready || own || state?.blocked){
    return null;
  }

  if(!user){
    return <Link href="/auth/login" className="ui-pill ui-pill--outline"><IconUserPlus size={15} stroke={1.8} /><span className="ui-pill__label">Подписаться</span></Link>;
  }

  return <>
    { withFriend && state?.friend && <span className="ui-friend-note"><IconUsers size={15} stroke={1.8} />Ваш друг</span> }
    <button
      type="button"
      className="ui-pill ui-pill--outline"
      data-active={state?.following || undefined}
      disabled={toggle.isPending || (state === null && !load.hasErrored)}
      onClick={() => toggle.execute({ follow: !state?.following })}
    >
      { state?.following ? <><IconUserCheck size={15} stroke={1.8} /><span className="ui-pill__label">Вы подписаны</span></> : <><IconUserPlus size={15} stroke={1.8} /><span className="ui-pill__label">Подписаться</span></> }
    </button>
    { followError && <Text size="sm" c="red">{ followError.message }</Text> }
  </>
}
