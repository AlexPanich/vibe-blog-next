import LocalDate from "@/components/general/LocalDate";
import type { AdminUserEvent } from "@/domains/users/shared/loadAdminUser";
import { plural } from "@/core/plural";

type UserAdminLogProps = {
  events: AdminUserEvent[],
  // Текущий год сервера: даты этого года — без года («8 нояб.»)
  year: number
}

/*
  «Последние действия» (спека 42, шаг 19): точка цвета события, текст, комментарий строкой
  ниже, дата справа. Первые VISIBLE видны сразу, остальные — под «Ещё N»
*/
export default function UserAdminLog({ events, year }: UserAdminLogProps) {
  if(events.length === 0){
    return <p className="ui-user-card__hint">Действий с пользователем ещё не было.</p>;
  }

  const rest = events.slice(VISIBLE);

  return <>
    <EventList events={events.slice(0, VISIBLE)} year={year} />
    { rest.length > 0 && <details className="ui-user-log__more">
      <summary>Ещё { rest.length } { plural(rest.length, [ 'событие', 'события', 'событий' ]) }</summary>
      <EventList events={rest} year={year} />
    </details> }
  </>;
}

function EventList({ events, year }: UserAdminLogProps) {
  return (
    <ol className="ui-user-log">
      { events.map(e => (
        <li key={e.key} className="ui-user-log__item">
          <span className="ui-user-log__dot" data-tone={e.tone} aria-hidden />
          <span className="ui-user-log__text">
            { e.text }
            { e.comment && <q>{ e.comment }</q> }
          </span>
          <span className="ui-user-log__at">
            <LocalDate
              value={e.at}
              options={e.at.getFullYear() === year
                ? { day: 'numeric', month: 'short' }
                : { day: 'numeric', month: 'short', year: 'numeric' }}
            />
          </span>
        </li>
      )) }
    </ol>
  );
}

const VISIBLE = 8;
