'use client'

import 'client-only';
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

type PostPhotoStageProps = {
  postId: number,
  // Соседние фото; null — край галереи
  prevId: number | null,
  nextId: number | null,
  children: ReactNode
}

// Горизонтальный сдвиг пальца, после которого свайп листает
const SWIPE_PX = 50;

/*
  Сцена страницы фото (спека 30): ← / → листают, Esc — обратно к посту, на телефоне —
  свайп. Ленту миниатюр прокручивает к текущему фото. Разметку сцены рисует сервер
*/
export default function PostPhotoStage({ postId, prevId, nextId, children }: PostPhotoStageProps) {
  const router = useRouter();
  const closeHref = `/posts/${postId}` as Route;
  const prevHref = prevId === null ? null : `/posts/${postId}/images/${prevId}` as Route;
  const nextHref = nextId === null ? null : `/posts/${postId}/images/${nextId}` as Route;
  const stage = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent){
      if(e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target) || document.querySelector('[role="dialog"]')){
        return;
      }

      const href = e.key === 'ArrowLeft' ? prevHref : e.key === 'ArrowRight' ? nextHref : e.key === 'Escape' ? closeHref : null;

      if(href){
        e.preventDefault();
        // Между фото страница не прыгает наверх, к посту — открывается с начала
        router.push(href, { scroll: href === closeHref });
      }
    }

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [ prevHref, nextHref, closeHref, router ]);

  // Текущая миниатюра — в середину ленты; scrollIntoView не годится: двигал бы и страницу
  useEffect(() => {
    const strip = stage.current?.parentElement?.querySelector<HTMLElement>('.ui-photo__strip');
    const current = strip?.querySelector<HTMLElement>('[aria-current]');

    if(strip && current){
      strip.scrollLeft = current.offsetLeft - strip.offsetLeft - (strip.clientWidth - current.clientWidth) / 2;
    }
  });

  return (
    <div
      ref={stage}
      className="ui-photo__stage"
      onTouchStart={e => { touchX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        const dx = touchX.current === null ? 0 : e.changedTouches[0].clientX - touchX.current;
        const href = dx > SWIPE_PX ? prevHref : dx < -SWIPE_PX ? nextHref : null;

        touchX.current = null;

        if(href){
          router.push(href, { scroll: false });
        }
      }}
    >
      { children }
    </div>
  );
}

function isTyping(target: EventTarget | null){
  return target instanceof HTMLElement && (target.isContentEditable || [ 'INPUT', 'TEXTAREA', 'SELECT' ].includes(target.tagName));
}
