import Link from "@/components/general/Link";
import LocalDate from "@/components/general/LocalDate";
import { plural } from "@/core/plural";
import type { Role } from "@/database/schema";
import UserAvatar from "@/domains/users/components/UserAvatar";
import UserRolePills from "@/domains/users/components/UserRolePills";
import AuthorRequestLink from "@/domains/users/components/authorRequest/AuthorRequestLink";
import AuthorRequestDecision from "@/domains/users/components/authorRequest/AuthorRequestDecision";
import { formatMonthSince } from "@/domains/users/shared/formatMonthSince";
import type { AdminAuthorRequest } from "@/domains/users/shared/loadAdminAuthorRequests";

type AuthorRequestCardProps = {
  request: AdminAuthorRequest,
  // Своя заявка — без решения: свои роли admin не меняет
  own: boolean
}

/*
  Ожидающая заявка в админке (спека 42, шаг 20): фиолетовая рамка, кто подал (роль, с
  какого месяца с нами, сколько комментариев, когда подана), текст заявки на подложке
  и под ним ссылка «Где почитать» (спека 48),
  поле «Причина отказа» и «Отклонить» / «Выдать роль автора». На телефоне в строке о
  заявителе — только роль и когда подана
*/
export default function AuthorRequestCard({ request, own }: AuthorRequestCardProps) {
  const { user } = request;

  return (
    <article className="ui-request-review">
      <header className="ui-request-review__top">
        <UserAvatar name={user.name} avatarKey={user.avatarKey} size={48} />
        <div className="ui-request-review__who">
          <span className="ui-request-review__name">
            <Link href={`/office/admin/users/${user.id}`}>{ user.name }</Link>
            { user.banned && <UserRolePills roles={[]} banned /> }
          </span>
          <span className="ui-request-review__meta">
            { requesterRole(user.roles) }
            <span className="ui-request-review__long">
              { ` с ${formatMonthSince(user.createdAt)} · ${user.commentsCount} ${plural(user.commentsCount, [ 'комментарий', 'комментария', 'комментариев' ])}` }
            </span>
            { ' · подана ' }<LocalDate value={request.createdAt} relative />
          </span>
        </div>
      </header>

      <div className="ui-request-review__quote">
        <span className="ui-request-review__label">О чём хочет писать</span>
        <p className="ui-request-review__text">{ request.text }</p>
        <AuthorRequestLink link={request.link} />
      </div>

      { own
        ? <p className="ui-request-review__note">Ваша заявка — решит другой администратор.</p>
        : <AuthorRequestDecision id={request.id} /> }
    </article>
  );
}

// Заявку подаёт не-автор: роль в строке — старшая из остальных или «Читатель»
function requesterRole(roles: Role[]){
  if(roles.includes('admin')){
    return 'Администратор';
  }
  else if(roles.includes('moderator')){
    return 'Модератор';
  }

  return 'Читатель';
}
