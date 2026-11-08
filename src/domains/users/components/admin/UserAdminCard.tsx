import type { ReactNode } from "react";

type UserAdminCardProps = {
  title: string,
  hint?: ReactNode,
  children: ReactNode
}

// Карточка на странице пользователя в админке (спека 42, шаг 19): заголовок, пояснение, содержимое.
export default function UserAdminCard({ title, hint, children }: UserAdminCardProps) {
  return (
    <section className="ui-user-card" aria-label={title}>
      <div className="ui-user-card__head">
        <h2 className="ui-user-card__title">{ title }</h2>
        { hint && <p className="ui-user-card__hint">{ hint }</p> }
      </div>
      { children }
    </section>
  );
}
