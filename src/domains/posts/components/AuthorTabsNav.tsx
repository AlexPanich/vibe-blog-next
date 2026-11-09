'use client'

import 'client-only';
import Link from "@/components/general/Link";
import useUser from "@/hooks/useUser";
import type { ReactNode } from "react";

type AuthorTabsNavProps = {
  authorId: number,
  // Ряд нужен и без владельца: есть вкладки кроме «всех» или открыта не «все»
  visible: boolean,
  // Публичной вкладки избранного нет — владельцу показать свою
  ownFavorites: boolean,
  children: ReactNode
}

/*
  Ряд вкладок на странице автора (спека 40). Владелец с закрытым или пустым избранным видит
  вкладку «видно только вам» в кабинет. Кто смотрит, знает только клиент; до гидрации
  (ready === false) ряд решает visible — так же, как на сервере
*/
export default function AuthorTabsNav({ authorId, visible, ownFavorites, children }: AuthorTabsNavProps) {
  const { user, ready } = useUser();
  const owner = ready && user?.id === authorId && ownFavorites;

  if(!visible && !owner){
    return null;
  }

  return (
    <nav className="ui-author-tabs" aria-label="Посты автора">
      { children }
      { owner && <Link href="/office/favorites" className="ui-author-tabs__own">Избранное <small>видно только вам</small></Link> }
    </nav>
  );
}
