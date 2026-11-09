import type { ReactNode } from "react";

/*
  Таблица «Всех постов» в админке (спека 42, шаг 17): шапка колонок и строки PostAdminRow.
  Сетка, а не <table>: на телефоне строка перестраивается в «заголовок / статус · автор ·
  дата · …». Колонка «Просмотры» — спека 43
*/
export default function PostAdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="ui-admin-posts" role="table" aria-label="Посты">
      <div className="ui-admin-posts__head" role="row">
        <span role="columnheader">Пост</span>
        <span role="columnheader">Автор</span>
        <span role="columnheader">Статус</span>
        <span role="columnheader">Просмотры</span>
        <span role="columnheader">Дата</span>
        <span role="columnheader" aria-label="Действия" />
      </div>
      { children }
    </div>
  );
}
