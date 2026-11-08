'use client'

import 'client-only';
import { IconChevronDown, IconHistory } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";

/*
  Карточка «История модерации». На десктопе лента видна всегда, на телефоне — свёрнута в
  строку «История модерации · N событий» (спека 42, шаг 14); что прятать, решает CSS по data-open
*/
export default function PostHistoryToggle({ summary, children }: { summary: string, children: ReactNode }) {
  const [ open, setOpen ] = useState(false);

  return (
    <section className="ui-mod-history" data-open={open ? '' : undefined} aria-label="История модерации">
      <h2 className="ui-mod-history__title">История модерации</h2>
      <button type="button" className="ui-mod-history__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <IconHistory size={16} stroke={1.8} />
        <span>{ summary }</span>
        <IconChevronDown size={16} stroke={1.8} />
      </button>
      <div className="ui-mod-history__body">{ children }</div>
    </section>
  );
}
