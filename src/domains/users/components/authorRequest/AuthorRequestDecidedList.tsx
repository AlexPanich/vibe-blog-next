import Link from "@/components/general/Link";
import LocalDate from "@/components/general/LocalDate";
import UserAvatar from "@/domains/users/components/UserAvatar";
import type { AdminAuthorRequest } from "@/domains/users/shared/loadAdminAuthorRequests";

type AuthorRequestDecidedListProps = {
  requests: AdminAuthorRequest[],
  // Своё решение подписывается «вы», как в макете
  meId: number
}

/*
  Рассмотренные заявки в админке (спека 42, шаг 20): аватар, имя, текст заявки в одну
  строку (у отклонённой ещё причина), пилюля «Одобрена / Отклонена», кто и когда решил.
  Имя растянуто на строку — кликается вся строка, ведёт в карточку пользователя
*/
export default function AuthorRequestDecidedList({ requests, meId }: AuthorRequestDecidedListProps) {
  return (
    <div className="ui-request-decided">
      { requests.map(request => {
        const approved = request.status === 'approved';

        return (
          <div key={request.id} className="ui-request-decided__row">
            <UserAvatar name={request.user.name} avatarKey={request.user.avatarKey} size={36} />
            <span className="ui-request-decided__body">
              <Link href={`/office/admin/users/${request.user.id}`} className="ui-request-decided__name">{ request.user.name }</Link>
              <span className="ui-request-decided__text">«{ request.text }»</span>
              { !approved && request.reason && <span className="ui-request-decided__reason">Причина: { request.reason }</span> }
            </span>
            <span className="ui-request-decided__aside">
              <span className="ui-request-decided__status" data-status={request.status}>{ approved ? 'Одобрена' : 'Отклонена' }</span>
              <span className="ui-request-decided__when">
                { request.decider && <>{ request.decider.id === meId ? 'вы' : request.decider.name } · </> }
                { request.decidedAt && <LocalDate value={request.decidedAt} options={{ day: 'numeric', month: 'short' }} /> }
              </span>
            </span>
          </div>
        );
      }) }
    </div>
  );
}
