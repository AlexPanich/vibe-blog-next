import Link from "@/components/general/Link";
import { IconArrowRight, type Icon } from "@tabler/icons-react";
import type { Route } from "next";
import type { ReactNode } from "react";

export type OfficeStep = {
  key: string,
  icon: Icon,
  title: string,
  text: ReactNode,
  action: { label: string, href: Route }
}

/*
  «С чего начать» (спека 27, вид — спека 42): карточки несделанных шагов. Сделанный шаг
  исчезает — прогресса «1 из 3» и «Скрыть» из макета нет (решение спеки 42)
*/
export default function OfficeStartSteps({ steps }: { steps: OfficeStep[] }) {
  return (
    <section className="ui-start-steps">
      <h2 className="ui-start-steps__title">С чего начать</h2>
      <div className="ui-start-steps__row">
        { steps.map(step => (
          <div key={step.key} className="ui-start-step">
            <span className="ui-start-step__head">
              <span className="ui-start-step__icon"><step.icon size={16} stroke={1.8} /></span>
              { step.title }
            </span>
            <p className="ui-start-step__text">{ step.text }</p>
            <Link href={step.action.href} className="ui-start-step__action">
              { step.action.label }<IconArrowRight size={14} stroke={2} />
            </Link>
          </div>
        )) }
      </div>
    </section>
  );
}
