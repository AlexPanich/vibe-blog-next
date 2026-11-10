import LocalDate from "@/components/general/LocalDate";
import AuthorRequestLink from "@/domains/users/components/authorRequest/AuthorRequestLink";
import type { AuthorRequest } from "@/database/types";
import { IconInfoCircle } from "@tabler/icons-react";

type AuthorRequestHistoryProps = {
  requests: AuthorRequest[]
}

const DAY: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };

/*
  «Рассмотренные» заявки пользователя: статус, даты, текст, ссылка «Где почитать» (спека 48) и
  причина отказа. На телефоне — только статус, дата решения и причина
*/
export default function AuthorRequestHistory({ requests }: AuthorRequestHistoryProps) {
  if(requests.length === 0){
    return null;
  }

  return (
    <section className="ui-request-history">
      <h2 className="ui-request-history__title">Рассмотренные</h2>
      { requests.map(request => {
        const approved = request.status === 'approved';

        return (
          <article key={request.id} className="ui-request-item">
            <div className="ui-request-item__top">
              <span className="ui-request-item__status" data-status={request.status}>
                <span className="ui-request-item__long">{ approved ? 'Заявка одобрена' : 'Заявка отклонена' }</span>
                <span className="ui-request-item__short">{ approved ? 'Одобрена' : 'Отклонена' }</span>
              </span>
              <span className="ui-request-item__when">
                <span className="ui-request-item__long">Подана <LocalDate value={request.createdAt} options={DAY} /></span>
                { request.decidedAt && <>
                  <span className="ui-request-item__long"> · рассмотрена </span>
                  <LocalDate value={request.decidedAt} options={DAY} />
                </> }
              </span>
            </div>
            <p className="ui-request-item__text">«{ request.text }»</p>
            <AuthorRequestLink link={request.link} />
            { !approved && request.reason && <p className="ui-request-item__reason">
              <IconInfoCircle size={15} stroke={2} />
              <span>Причина<span className="ui-request-item__long"> отказа</span>: { request.reason }</span>
            </p> }
          </article>
        );
      }) }
    </section>
  );
}
