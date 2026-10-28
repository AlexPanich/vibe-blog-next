import { IconMailCheck } from "@tabler/icons-react";

export const metadata = { title: 'Аккаунт создан' };

export default function SignSuccess(){
  return <section className="ui-panel ui-panel--narrow">
    <div className="ui-panel__head">
      <p className="ui-kicker">Почти готово</p>
      <h1 className="ui-panel__title">Аккаунт создан</h1>
    </div>
    <div className="ui-empty">
      <IconMailCheck size={26} stroke={1.6} />
      <p>Проверьте почту и подтвердите адрес по ссылке из письма.</p>
    </div>
  </section>
}
