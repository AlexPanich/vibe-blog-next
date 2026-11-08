import type { ReactNode } from "react";
import { IconCheck } from "@tabler/icons-react";

// Докуда дошла заявка: шаги до него — сделаны, он сам — текущий
export type AuthorRequestStage = 'new' | 'pending' | 'author';

type AuthorRequestHeroProps = {
  stage: AuthorRequestStage,
  title: ReactNode,
  text: ReactNode,
  // Короче для телефона; без него — тот же text
  shortText?: ReactNode,
  action?: ReactNode
}

const STEPS = [ 'Пишете заявку', 'Администратор читает', 'Получаете роль автора' ];

const DONE_STEPS: Record<AuthorRequestStage, number> = { new: 0, pending: 1, author: 3 };

/*
  Коралловый баннер страницы заявки (спека 42, шаг 12) — он же шапка страницы с h1.
  Справа три шага, на телефоне их нет
*/
export default function AuthorRequestHero({ stage, title, text, shortText, action }: AuthorRequestHeroProps) {
  const done = DONE_STEPS[stage];

  return (
    <section className="ui-request-hero">
      <div className="ui-request-hero__text">
        <p className="ui-request-hero__kicker">Заявка в авторы</p>
        <h1 className="ui-request-hero__title">{ title }</h1>
        <p className="ui-request-hero__desc">
          { shortText ? <>
            <span className="ui-request-hero__long">{ text }</span>
            <span className="ui-request-hero__short">{ shortText }</span>
          </> : text }
        </p>
        { action && <div className="ui-request-hero__action">{ action }</div> }
      </div>

      <ol className="ui-request-hero__steps">
        { STEPS.map((step, i) => (
          <li key={step} data-state={i < done ? 'done' : i === done && stage === 'pending' ? 'current' : undefined}>
            <span className="ui-request-hero__num">
              { i < done ? <IconCheck size={14} stroke={3} /> : i + 1 }
            </span>
            { step }
          </li>
        )) }
      </ol>
    </section>
  );
}
