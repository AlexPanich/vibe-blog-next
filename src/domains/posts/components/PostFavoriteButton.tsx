'use client'

import 'client-only';
import { myPostFavoriteAction, togglePostFavoriteAction } from "@/domains/posts/actions/postFavoriteActions";
import useUser from "@/hooks/useUser";
import { Button, Text } from "@mantine/core";
import { IconBookmark, IconBookmarkFilled } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useEffect, useRef, useState } from "react";

// Закладка на странице поста. Состояние — после гидрации: публичная страница сессию на сервере не читает.
export default function PostFavoriteButton({ id }: { id: number }) {
  const { user, ready } = useUser();
  const [ favorite, setFavorite ] = useState<boolean | null>(null);
  const toggle = useAction(togglePostFavoriteAction.bind(null, id), { onSuccess: ({ data }) => setFavorite(data.favorite) });
  const load = useAction(myPostFavoriteAction.bind(null, id), { onSuccess: ({ data }) => setFavorite(data.favorite) });
  const { execute: loadMine } = load;
  // execute меняется на каждом рендере — без метки эффект запрашивал бы по кругу
  const loadedFor = useRef<number | null>(null);

  useEffect(() => {
    if(ready && user && loadedFor.current !== user.id){
      loadedFor.current = user.id;
      loadMine();
    }
  }, [ ready, user, loadMine ]);

  if(!ready){
    return null;
  }

  if(!user){
    return <Text size="sm"><Link href="/auth/login">Войдите</Link>, чтобы добавить в избранное.</Text>;
  }

  return <>
    <Button
      variant={favorite ? 'light' : 'default'}
      leftSection={favorite ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
      loading={toggle.isPending || favorite === null}
      onClick={() => toggle.execute({ favorite: !favorite })}
    >
      { favorite ? 'В избранном' : 'В избранное' }
    </Button>
    { toggle.result.serverError && <Text size="sm" c="red">{ toggle.result.serverError.message }</Text> }
  </>
}
