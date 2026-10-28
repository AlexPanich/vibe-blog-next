import LocalDate from "@/components/general/LocalDate";
import type { User, UserAdminAction } from "@/database/types";
import { USER_ADMIN_ACTION_LABELS } from "@/domains/users/shared/userAdminActionLabels";

type UserAdminHistoryProps = {
  actions: (Pick<UserAdminAction, 'id' | 'action' | 'role' | 'comment' | 'createdAt'> & { actor: Pick<User, 'name'> })[]
}

// Журнал действий admin над пользователем, свежие сверху: «действие · кто · когда».
export default function UserAdminHistory({ actions }: UserAdminHistoryProps) {
  if(actions.length === 0){
    return <p className="ui-meta">Действий с пользователем ещё не было.</p>;
  }

  return (
    <div className="ui-rows">
      { actions.map(a => (
        <div key={a.id} className={a.action === 'banned' ? 'ui-note ui-note--danger' : 'ui-note'}>
          <span className="ui-note__label">
            { USER_ADMIN_ACTION_LABELS[a.action] }{ a.role && ` ${a.role}` } · { a.actor.name } ·{' '}
            <LocalDate value={a.createdAt} />
          </span>
          { a.comment }
        </div>
      )) }
    </div>
  );
}
