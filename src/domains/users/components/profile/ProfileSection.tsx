import type { ReactNode } from "react";

type ProfileSectionProps = {
  // Якорь для ссылок на секцию: /office/profile#favorites
  id?: string,
  title: string,
  hint: string,
  // Подпись капсом над секцией на телефоне; по умолчанию — title, false — без подписи
  mobileTitle?: string | false,
  children: ReactNode
}

// Секция профиля (спека 42, шаг 11): подпись и пояснение слева, поля справа.
export default function ProfileSection({ id, title, hint, mobileTitle = title, children }: ProfileSectionProps) {
  return (
    <section id={id} className="ui-account__section" aria-label={title}>
      <div className="ui-account__label">
        <h2 className="ui-account__title">{ title }</h2>
        <p className="ui-account__hint">{ hint }</p>
        { mobileTitle !== false && <p className="ui-account__caps" aria-hidden>{ mobileTitle }</p> }
      </div>
      <div className="ui-account__body">{ children }</div>
    </section>
  );
}
