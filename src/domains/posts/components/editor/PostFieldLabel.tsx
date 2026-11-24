import type { ReactNode } from "react";

type PostFieldLabelProps = {
  hint?: ReactNode,
  // Кнопка справа после подсказки — помощник автора (спека 55)
  action?: ReactNode,
  children: ReactNode
}

// Подпись поля редактора с подсказкой справа: «12 / 16», «Markdown» (спека 42)
export default function PostFieldLabel({ hint, action, children }: PostFieldLabelProps){
  const hintNode = hint !== undefined && <span className="ui-field__hint">{ hint }</span>;

  return <span className="ui-field__label">
    { children } { action ? <span className="ui-field__side">{ hintNode }{ action }</span> : hintNode }
  </span>;
}
