'use client'

import 'client-only';
import { myPostFavoriteAction, togglePostFavoriteAction } from "@/domains/posts/actions/postFavoriteActions";
import useUser from "@/hooks/useUser";
import Link from "@/components/general/Link";
import { Text } from "@mantine/core";
import { IconBookmark, IconBookmarkFilled } from "@tabler/icons-react";
import ShareButton from "@/domains/posts/components/ShareButton";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";

type PostActionsProps = {
  id: number,
  title: string
}

/*
  Избранное и «поделиться» на странице поста (спека 30). Один компонент рисует и ряд под
  текстом (широкий экран), и закреплённую снизу панель телефона — у них общее состояние
  закладки. Панель position: fixed, поэтому её место в разметке не важно; CSS прячет
  нижние вкладки, пока она на странице
*/
export default function PostActions({ id, title }: PostActionsProps) {
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

  // После выхода в той же вкладке закладку прежнего пользователя не показываем
  const marked = ready && user ? favorite === true : false;
  const busy = toggle.isPending || (ready && !!user && favorite === null && !load.hasErrored);
  const label = marked ? 'В избранном' : 'В избранное';
  const Icon = marked ? IconBookmarkFilled : IconBookmark;
  const error = toggle.result.serverError ?? load.result.serverError;

  function favoriteControl(className: string, withLabel: boolean){
    const body = <><Icon size={withLabel ? 17 : 19} stroke={1.8} />{ withLabel && <span>{ label }</span> }</>;

    // Гостю и до гидрации — ссылка на вход: сервер не знает, кто смотрит
    if(!ready || !user){
      return <Link href="/auth/login" className={className} aria-label={withLabel ? undefined : 'Войти, чтобы добавить в избранное'}>{ body }</Link>;
    }

    return (
      <button
        type="button"
        className={className}
        data-active={marked || undefined}
        aria-pressed={marked}
        aria-label={withLabel ? undefined : label}
        disabled={busy}
        onClick={() => toggle.execute({ favorite: !marked })}
      >
        { body }
      </button>
    );
  }

  return <>
    <div className="ui-post-actions">
      { favoriteControl('ui-pill ui-pill--favorite', true) }
      <ShareButton title={title} />
    </div>
    { error && <Text size="sm" c="red">{ error.message }</Text> }

    <div className="ui-post-bar">
      { ready && user
        ? <button type="button" className="ui-post-bar__input" onClick={focusCommentForm}>Написать комментарий…</button>
        : <Link href="/auth/login" className="ui-post-bar__input">Войдите, чтобы комментировать</Link> }
      { favoriteControl('ui-pill ui-pill--icon ui-pill--favorite', false) }
      <ShareButton title={title} iconSize={19} />
    </div>
  </>
}

// Поле комментария — в блоке комментариев (CommentsBlock, id comment-composer)
function focusCommentForm(){
  const field = document.querySelector<HTMLTextAreaElement>('#comment-composer textarea');

  field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  field?.focus({ preventScroll: true });
}
