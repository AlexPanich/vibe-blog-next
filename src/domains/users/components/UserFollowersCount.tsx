'use client'

import 'client-only';
import { plural } from "@/core/plural";
import useLiveEvent from "@/hooks/useLiveEvent";
import useLiveTopic from "@/hooks/useLiveTopic";
import { userTopic } from "@/shared/liveEvents";
import { useState } from "react";

/*
  Цифра «читатели» в профиле автора: число подписчиков с сервера, дальше — из живого канала
  (спека 29), и от своей подписки, и от чужих; подпись склоняется по нему же
*/
export default function UserFollowersCount({ authorId, initial }: { authorId: number, initial: number }) {
  const [ count, setCount ] = useState(initial);

  useLiveTopic(userTopic(authorId));

  useLiveEvent('user.followers', data => {
    if(data.userId === authorId){
      setCount(data.followersCount);
    }
  });

  return (
    <div>
      <dt>{ plural(count, [ 'читатель', 'читателя', 'читателей' ]) }</dt>
      <dd>{ count.toLocaleString('ru-RU') }</dd>
    </div>
  );
}
