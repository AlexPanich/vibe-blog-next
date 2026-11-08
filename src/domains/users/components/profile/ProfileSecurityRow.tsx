'use client'

import 'client-only';
import Link from "@/components/general/Link";
import { IconChevronRight } from "@tabler/icons-react";
import type { Route } from "next";
import { useId, useState, type ReactNode } from "react";

type ProfileSecurityRowProps = {
  icon: ReactNode,
  title: string,
  text: ReactNode,
  // Подпись действия: «Изменить» / «Сменить»; без неё строка только показывает
  action?: string,
  // Действие — переход, а не форма под строкой
  href?: Route,
  // Форма, которая раскрывается под строкой по действию
  children?: ReactNode
}

/*
  Строка «Безопасности» (email, пароль): иконка, название, состояние и действие справа.
  На телефоне действие — шеврон. Форма раскрывается под строкой и остаётся открытой после
  сохранения — в ней сообщение об успехе
*/
export default function ProfileSecurityRow({ icon, title, text, action, href, children }: ProfileSecurityRowProps) {
  const [ open, setOpen ] = useState(false);
  const formId = useId();
  const label = <>
    <span className="ui-account-security__action">{ open ? 'Свернуть' : action }</span>
    <IconChevronRight size={16} className="ui-account-security__chevron" data-open={open} />
  </>;

  return (
    <div className="ui-account-security__item">
      <div className="ui-account-security__row">
        <span className="ui-account-security__icon">{ icon }</span>
        <span className="ui-account-security__text">
          <b>{ title }</b>
          <small>{ text }</small>
        </span>
        { action && (href
          ? <Link href={href} className="ui-account-security__toggle" aria-label={`${action}: ${title}`}>{ label }</Link>
          : <button
            type="button"
            className="ui-account-security__toggle"
            aria-expanded={open}
            aria-controls={formId}
            aria-label={`${open ? 'Свернуть' : action}: ${title}`}
            onClick={() => setOpen(!open)}
          >
            { label }
          </button>) }
      </div>
      { children && <div id={formId} className="ui-account-security__form" hidden={!open}>{ children }</div> }
    </div>
  );
}
