'use client'

import 'client-only';
import { useState, type ReactNode } from "react";

type FeedFollowChipsShellProps = {
  // Сколько чипов спрятано (data-extra) до нажатия «ещё N»
  extra: number,
  children: ReactNode
}

/*
  Ряд чипов подписок и кнопка «ещё N», которая показывает спрятанные. Чипы рендерит сервер,
  здесь — только флаг «раскрыто». На телефоне ряд листается и показывает все сразу (CSS)
*/
export default function FeedFollowChipsShell({ extra, children }: FeedFollowChipsShellProps) {
  const [ open, setOpen ] = useState(false);

  return (
    <nav className="ui-feed-chips" aria-label="Чьи посты" data-open={open || undefined}>
      { children }
      { extra > 0 && !open && <button type="button" className="ui-feed-chips__more" onClick={() => setOpen(true)}>
        ещё { extra }
      </button> }
    </nav>
  );
}
