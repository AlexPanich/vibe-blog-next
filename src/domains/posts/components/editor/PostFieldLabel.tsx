import type { ReactNode } from "react";

// Подпись поля редактора с подсказкой справа: «12 / 16», «Markdown» (спека 42)
export default function PostFieldLabel({ hint, children }: { hint: ReactNode, children: ReactNode }){
  return <span className="ui-field__label">{ children } <span className="ui-field__hint">{ hint }</span></span>;
}
