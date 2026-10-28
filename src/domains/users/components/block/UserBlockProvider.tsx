'use client'

import 'client-only';
import { myUserBlockAction } from "@/domains/users/actions/userBlockActions";
import { UserBlockContext, type UserBlockState } from "@/domains/users/components/block/userBlockContext";
import useUser from "@/hooks/useUser";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";

type UserBlockProviderProps = {
  authorId: number,
  authorName: string,
  children: React.ReactNode
}

/*
  Блокировка на странице автора (спека 26): одно состояние на страницу — его читают
  UserBlockGate (прячет страницу у блокирующего) и UserBlockButton. Публичная страница
  сессию на сервере не читает — состояние приходит после гидрации
*/
export default function UserBlockProvider({ authorId, authorName, children }: UserBlockProviderProps) {
  const { user, ready } = useUser();
  const [ state, setState ] = useState<UserBlockState | null>(null);
  const load = useAction(myUserBlockAction.bind(null, authorId), { onSuccess: ({ data }) => setState(data) });
  const { execute: loadMine } = load;
  // execute меняется на каждом рендере — без метки эффект запрашивал бы по кругу
  const loadedFor = useRef<number | null>(null);

  useEffect(() => {
    if(ready && user && user.id !== authorId && loadedFor.current !== user.id){
      loadedFor.current = user.id;
      loadMine();
    }
  }, [ ready, user, authorId, loadMine ]);

  return <UserBlockContext value={{ authorId, authorName, state: ready && user ? state : null, setState }}>
    { children }
  </UserBlockContext>
}
