import type { ReactNode } from "react";

type ErrorScreenProps = {
  // Код ответа плитками («404», «403»); без кода — одна плитка «!» (сбой рендера)
  code?: string
  kicker: string
  title: string
  children: ReactNode
  actions: ReactNode
}

/*
  Страница ошибки (спека 52): плитки с кодом, заголовок, что случилось и куда идти дальше.
  Без пометок server/client: её рисуют и серверные not-found / forbidden, и клиентские
  error / global-error. Кнопки приходят слотом — у каждой границы свой следующий шаг
*/
export default function ErrorScreen({ code, kicker, title, children, actions }: ErrorScreenProps) {
  const tiles = code ? [...code] : ['!'];

  return (
    <section className="ui-error">
      <div className={code ? 'ui-error__code' : 'ui-error__code ui-error__code--alert'} aria-hidden>
        { tiles.map((tile, i) => <span key={i}>{ tile }</span>) }
      </div>
      <p className="ui-kicker">{ kicker }</p>
      <h1 className="ui-error__title">{ title }</h1>
      <p className="ui-error__text">{ children }</p>
      <div className="ui-error__actions">{ actions }</div>
    </section>
  );
}
