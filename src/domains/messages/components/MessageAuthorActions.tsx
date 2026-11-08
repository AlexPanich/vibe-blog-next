'use client'

import 'client-only';
import { messageStateAction } from "@/domains/messages/actions/messageActions";
import { restrictMessagesAction } from "@/domains/messages/actions/messageSettingsActions";
import useUser from "@/hooks/useUser";
import { Menu, MenuDropdown, MenuItem, MenuTarget, Text } from "@mantine/core";
import { IconDots, IconMessage, IconMessageCircle, IconMessageCircleOff } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useEffect, useRef, useState } from "react";

type MessageAuthorActionsProps = {
  authorId: number,
  // Пункты других доменов в меню «…» (блокировка) — домен messages о них не знает
  menuItems?: React.ReactNode
}

/*
  «Написать» и меню «…» на странице автора — пилюлями рядом с подпиской (спека 30). В меню —
  «Запретить писать» / «Разрешить писать» и пункты из menuItems. Состояние — после гидрации:
  публичная страница сессию на сервере не читает. Гостю «Написать» ведёт на вход, меню нет.
  Писать нельзя — вместо «Написать» причина. На телефоне от «Написать» остаётся иконка
  (подпись — в span, прячет CSS)
*/
export default function MessageAuthorActions({ authorId, menuItems }: MessageAuthorActionsProps) {
  const { user, ready } = useUser();
  const load = useAction(messageStateAction.bind(null, authorId), { onSuccess: ({ data }) => setRestricted(data.restricted) });
  const { execute: loadState } = load;
  // Меню размонтирует пункты при закрытии — состояние и action живут здесь
  const [ restricted, setRestricted ] = useState(false);
  const restrict = useAction(restrictMessagesAction.bind(null, authorId), { onSuccess: ({ data }) => setRestricted(data.restricted) });
  // execute меняется на каждом рендере — без метки эффект запрашивал бы по кругу
  const loadedFor = useRef<number | null>(null);
  const own = ready && user?.id === authorId;

  useEffect(() => {
    if(ready && user && !own && loadedFor.current !== user.id){
      loadedFor.current = user.id;
      loadState();
    }
  }, [ ready, user, own, loadState ]);

  if(!ready || own){
    return null;
  }

  if(!user){
    return <Link href="/auth/login" className="ui-pill ui-pill--message" aria-label="Написать"><IconMessage size={17} stroke={1.8} /><span>Написать</span></Link>;
  }

  const state = load.result.data;

  if(!state){
    return null;
  }

  const href = state.dialogId ? `/office/messages/${state.dialogId}` as const : `/office/messages/new?to=${authorId}` as const;

  return <>
    { state.blockReason
      ? <Text size="sm" c="dimmed" className="ui-author-head__reason">{ state.blockReason }</Text>
      : <Link href={href} className="ui-pill ui-pill--message" aria-label="Написать"><IconMessage size={17} stroke={1.8} /><span>Написать</span></Link> }
    <Menu position="bottom-end" withinPortal>
      <MenuTarget>
        <button type="button" className="ui-pill ui-pill--icon" aria-label="Ещё" title="Ещё">
          <IconDots size={18} stroke={1.8} />
        </button>
      </MenuTarget>
      <MenuDropdown>
        <MenuItem
          leftSection={restricted ? <IconMessageCircle size={16} stroke={1.8} /> : <IconMessageCircleOff size={16} stroke={1.8} />}
          disabled={restrict.isPending}
          onClick={() => restrict.execute({ restrict: !restricted })}
        >
          { restricted ? 'Разрешить писать' : 'Запретить писать' }
        </MenuItem>
        { menuItems }
      </MenuDropdown>
    </Menu>
    { restrict.result.serverError && <Text size="sm" c="red">{ restrict.result.serverError.message }</Text> }
  </>;
}
