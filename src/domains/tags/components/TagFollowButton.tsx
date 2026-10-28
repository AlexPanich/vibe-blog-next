'use client'

import 'client-only';
import { followTagAction, myTagFollowAction } from "@/domains/tags/actions/tagFollowActions";
import useUser from "@/hooks/useUser";
import { Button, Text } from "@mantine/core";
import { IconBellCheck, IconBellPlus } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";

// Подписка на рубрику под фильтром ленты. Гостю не рисуется: подписка — про «Мою ленту» в кабинете.
export default function TagFollowButton({ tagId, name }: { tagId: number, name: string }) {
  const { user, ready } = useUser();
  const [ following, setFollowing ] = useState<boolean | null>(null);
  const toggle = useAction(followTagAction.bind(null, tagId), { onSuccess: ({ data }) => setFollowing(data.following) });
  const load = useAction(myTagFollowAction.bind(null, tagId), { onSuccess: ({ data }) => setFollowing(data.following) });
  const { execute: loadMine } = load;
  // execute меняется на каждом рендере — без метки эффект запрашивал бы по кругу; ключ — пара пользователь–рубрика
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    const key = `${user?.id}:${tagId}`;

    if(ready && user && loadedFor.current !== key){
      loadedFor.current = key;
      setFollowing(null);
      loadMine();
    }
  }, [ ready, user, tagId, loadMine ]);

  if(!ready || !user){
    return null;
  }

  return <div className="ui-tag-follow">
    <Button
      size="compact-sm"
      variant={following ? 'default' : 'light'}
      leftSection={following ? <IconBellCheck size={15} /> : <IconBellPlus size={15} />}
      loading={toggle.isPending || (following === null && !load.hasErrored)}
      onClick={() => toggle.execute({ follow: !following })}
    >
      { following ? `Вы подписаны на «${name}» — отписаться` : `Подписаться на «${name}»` }
    </Button>
    { toggle.result.serverError && <Text size="sm" c="red">{ toggle.result.serverError.message }</Text> }
    { load.result.serverError && <Text size="sm" c="red">{ load.result.serverError.message }</Text> }
  </div>
}
