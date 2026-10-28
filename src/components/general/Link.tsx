import NextLink from "next/link";
import type { ComponentProps } from "react";

/*
  next/link без prefetch по умолчанию. В production Next подгружает каждую видимую ссылку
  заранее: меню кабинета и списки дают десятки запросов за раз, и глобальный rate limit в
  proxy (30 в секунду с IP) отвечает 429 — страницы после действий перестают обновляться.
  Страницы у нас динамические, выигрыш от prefetch небольшой. Где он нужен — prefetch явно.
  Без пометок server/client: работает и там, и там
*/
export default function Link<T>({ prefetch = false, ...props }: ComponentProps<typeof NextLink<T>>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
