'use client'

import 'client-only';
import { plural } from "@/core/plural";
import useLiveEvent from "@/hooks/useLiveEvent";
import useLiveTopic from "@/hooks/useLiveTopic";
import type { LiveTopic } from "@/shared/liveEvents";
import { useState } from "react";

type UserFollowersCountProps = {
  authorId: number,
  initial: number,
  // user:<id> — плитка и профиль, AUTHORS_TOPIC — /authors
  topic: LiveTopic,
  // number — «12», label — «читателей», text — «12 читателей»
  view: 'number' | 'label' | 'text'
}

/*
  Живое число читателей (спеки 29, 53) — в профиле, плитке главной, карточке и строке /authors:
  с сервера, дальше — из живого канала, и от своей подписки, и от чужих; подпись склоняется по
  нему же. Отдаёт только текст — обёртку (dt, dd, ячейку) ставит место. Новый initial с сервера
  (router.refresh, мягкая навигация) сбрасывает число
*/
export default function UserFollowersCount({ authorId, initial, topic, view }: UserFollowersCountProps) {
  const [ shown, setShown ] = useState({ initial, count: initial });

  if(shown.initial !== initial){
    setShown({ initial, count: initial });
  }

  const count = shown.initial === initial ? shown.count : initial;

  useLiveTopic(topic);

  useLiveEvent('user.followers', data => {
    if(data.userId === authorId){
      setShown(prev => ({ ...prev, count: data.followersCount }));
    }
  });

  const number = count.toLocaleString('ru-RU');
  const label = plural(count, [ 'читатель', 'читателя', 'читателей' ]);

  if(view === 'number'){
    return <>{ number }</>;
  }
  else if(view === 'label'){
    return <>{ label }</>;
  }

  return <>{ number } { label }</>;
}
