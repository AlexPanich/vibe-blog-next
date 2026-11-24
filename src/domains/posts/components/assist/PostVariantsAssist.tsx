'use client'

import 'client-only';
import { IconCheck } from "@tabler/icons-react";

type PostVariantsAssistProps = {
  variants: string[],
  // Текущее значение поля: по нему отмечается применённый вариант, без своего state
  value: string,
  onPick: (value: string) => void
}

// Варианты заголовка и подзаголовка (спека 55, п. 12): клик заменяет поле, блок остаётся открытым
export default function PostVariantsAssist({ variants, value, onPick }: PostVariantsAssistProps){
  return (
    <ul className="ui-assist__variants">
      { variants.map((variant, index) => {
        const applied = variant === value.trim();

        return <li key={index}>
          <button
            type="button"
            className="ui-assist__variant"
            data-applied={applied || undefined}
            aria-pressed={applied}
            onClick={() => onPick(variant)}
          >
            <span>{ variant }</span>
            { applied && <IconCheck size={16} stroke={2} aria-label="Применено" /> }
          </button>
        </li>;
      }) }
    </ul>
  );
}
