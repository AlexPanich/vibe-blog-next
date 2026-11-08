import type { ReactNode } from "react";

/*
  Таблица справочника рубрик (спека 42, шаг 16): шапка колонок и строки TagTableRow.
  Сетка, а не <table>: на телефоне строка перестраивается в «чип · цифры · …»
*/
export default function TagTable({ children }: { children: ReactNode }) {
  return (
    <div className="ui-tag-table" role="table" aria-label="Рубрики">
      <div className="ui-tag-table__head" role="row">
        <span role="columnheader">Рубрика</span>
        <span role="columnheader">Slug</span>
        <span role="columnheader" className="ui-tag-table__num">Постов</span>
        <span role="columnheader" className="ui-tag-table__num">Подписч.</span>
        <span role="columnheader" aria-label="Действия" />
      </div>
      { children }
    </div>
  );
}
