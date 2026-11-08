import type { ReactNode } from "react";

/*
  Таблица «Пользователей» в админке (спека 42, шаг 18): шапка колонок и строки UserAdminRow.
  Сетка, а не <table>, как «Все посты»: на телефоне строка перестраивается в «аватар / имя и
  роли / ›»
*/
export default function UserAdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="ui-admin-users" role="table" aria-label="Пользователи">
      <div className="ui-admin-users__head" role="row">
        <span role="columnheader">Пользователь</span>
        <span role="columnheader">Роли</span>
        <span role="columnheader">Постов</span>
        <span role="columnheader">С нами</span>
        <span role="columnheader" aria-label="Действия" />
      </div>
      { children }
    </div>
  );
}
