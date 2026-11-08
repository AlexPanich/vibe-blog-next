import type { ReactNode } from "react";

type OfficeHeadProps = {
  title: ReactNode,
  // Строка с цифрами под заголовком: «12 постов · 9 опубликовано»
  sub?: ReactNode,
  // Главное или вторичное действие справа
  action?: ReactNode
}

// Шапка страницы кабинета (спека 42): заголовок, под ним строка с цифрами, справа действие.
export default function OfficeHead({ title, sub, action }: OfficeHeadProps) {
  return (
    <div className="ui-section-head ui-office-head">
      <div>
        <h1 className="ui-title">{ title }</h1>
        { sub && <p className="ui-office-head__sub">{ sub }</p> }
      </div>
      { action && <div className="ui-office-head__actions">{ action }</div> }
    </div>
  );
}
