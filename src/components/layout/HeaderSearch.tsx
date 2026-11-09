'use client'

import 'client-only';
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Link from "@/components/general/Link";
import { FEED_SEARCH_ID } from "@/shared/feedSearch";
import { IconSearch, IconX } from "@tabler/icons-react";

type HeaderSearchProps = {
  brand: ReactNode
  menu: ReactNode
  // Иконки справа от лупы: тема, уведомления, пользователь
  aside: ReactNode
}

/*
  Строка шапки целиком (спека 33): поле поиска встаёт на место меню (десктоп) или во всю строку
  (телефон), поэтому бренд, меню и правые иконки приходят слотами из серверного SiteHeader.
  Поле рендерится только в открытом состоянии: на сервере всегда закрыто, гидрация не расходится,
  а без JS лупа остаётся ссылкой на ленту.
*/
export default function HeaderSearch({ brand, menu, aside }: HeaderSearchProps) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLAnchorElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Клик по лупе и «/». Фокус — синхронно в обработчике жеста, иначе iOS не откроет клавиатуру
  const openSearch = () => {
    const feedInput = pathname === '/posts' ? document.getElementById(FEED_SEARCH_ID) : null;

    // В ленте своё поле с фильтрами: второе в шапке не открываем
    if(feedInput){
      feedInput.focus({ preventScroll: true });
      feedInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    flushSync(() => setOpen(true));
    inputRef.current?.focus();
  };

  // Лупа на телефоне видна только после закрытия — поэтому сначала flushSync
  const close = (returnFocus: boolean) => {
    flushSync(() => setOpen(false));

    if(returnFocus){
      toggleRef.current?.focus();
    }
  };

  const onToggleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Ctrl/Cmd/Shift-клик — обычная ссылка на ленту в новой вкладке или окне
    if(e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey){
      return;
    }

    e.preventDefault();

    if(open){
      close(true);
    }
    else{
      openSearch();
    }
  };

  // Новый поиск по всем постам: фильтры текущей ленты не переносятся. Мягкая навигация —
  // живой канал и тосты не перезапускаются. URL собран здесь: feedUrl — внутренность домена posts
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = (inputRef.current?.value ?? '').trim();
    router.push(query ? `/posts?search=${encodeURIComponent(query)}` : '/posts');
    setOpen(false);
  };

  const onFormKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if(e.key === 'Escape'){
      e.preventDefault();
      close(true);
    }
  };

  const onSlashKey = useEffectEvent((e: globalThis.KeyboardEvent) => {
    if(!isSlashHotkey(e) || isTypingTarget(e.target)){
      return;
    }

    // Firefox иначе откроет свой быстрый поиск
    e.preventDefault();

    if(!open){
      openSearch();
    }
    else{
      inputRef.current?.focus();
    }
  });

  useEffect(() => {
    const listener = (e: globalThis.KeyboardEvent) => onSlashKey(e);
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);

  // Клик мимо закрывает без возврата фокуса: он уходит туда, куда кликнули
  useEffect(() => {
    if(!open){
      return;
    }

    const listener = (e: PointerEvent) => {
      const target = e.target as Node | null;

      if(!target || formRef.current?.contains(target) || toggleRef.current?.contains(target)){
        return;
      }

      setOpen(false);
    };

    document.addEventListener('pointerdown', listener);
    return () => document.removeEventListener('pointerdown', listener);
  }, [open]);

  return (
    <div className="ui-shell ui-masthead__row" data-search={open ? 'open' : undefined}>
      { brand }
      { open ? (
        <form
          ref={formRef}
          id="header-search"
          action="/posts"
          method="get"
          role="search"
          className="ui-search ui-header-search"
          onSubmit={onSubmit}
          onKeyDown={onFormKeyDown}
        >
          <IconSearch size={17} stroke={1.7} className="ui-search__icon" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            name="search"
            maxLength={100}
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Поиск по постам"
            aria-label="Поиск по постам"
            className="ui-search__input"
          />
          <button type="button" className="ui-header-search__close" aria-label="Закрыть поиск" onClick={() => close(true)}>
            <IconX size={18} aria-hidden />
          </button>
        </form>
      ) : menu }
      <div className="ui-masthead__aside">
        <Link
          ref={toggleRef}
          href="/posts"
          className="ui-round-icon"
          onClick={onToggleClick}
          aria-label="Поиск по постам"
          title="Поиск по постам (/)"
          aria-expanded={open}
          aria-controls="header-search"
        >
          <IconSearch size={18} aria-hidden />
        </Link>
        { aside }
      </div>
    </div>
  );
}

// «/» без модификаторов. На русской раскладке эта клавиша даёт «.», поэтому смотрим и code.
// Shift модификатором не считаем: на части раскладок «/» без него не набрать
function isSlashHotkey(e: globalThis.KeyboardEvent) {
  if(e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.defaultPrevented){
    return false;
  }

  return e.key === '/' || (e.code === 'Slash' && !e.shiftKey);
}

// Поле ввода, редактор или открытый диалог Mantine: «/» там — обычный символ или чужая клавиша
function isTypingTarget(target: EventTarget | null) {
  return target instanceof Element
    && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"]') !== null;
}
