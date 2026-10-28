import 'client-only';
import Link from "@/components/general/Link";
import { notifications } from "@mantine/notifications";
import type { Route } from "next";
import type { ReactNode } from "react";

type ToastOptions = {
  id: string,
  icon: ReactNode,
  title: string,
  text: string,
  // Без ссылки тост — просто текст
  href: string | null,
  onOpen?: () => void
}

/*
  Тост живого канала (спека 29). Ссылка — содержимое, а не onClick всего тоста: крестик
  закрывает, не переходя. id — чтобы повтор события в другой подписке не дал второй тост
*/
export function showToast({ id, icon, title, text, href, onOpen }: ToastOptions){
  const body = <span className="ui-toast">
    { icon }
    <span className="ui-toast__body">
      <span className="ui-toast__title">{ title }</span>
      <span className="ui-toast__text">{ text }</span>
    </span>
  </span>;

  notifications.show({
    id,
    message: href
      ? <Link href={href as Route} className="ui-toast__link" onClick={() => { notifications.hide(id); onOpen?.(); }}>{ body }</Link>
      : body
  });
}
