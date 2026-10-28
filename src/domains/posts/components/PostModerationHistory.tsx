import LocalDate from "@/components/general/LocalDate";
import type { ModerationDecision } from "@/database/schema";
import type { PostModeration, User } from "@/database/types";
import { IconCheck, IconLock, IconLockOpen, IconX, type Icon } from "@tabler/icons-react";

type PostModerationHistoryProps = {
  moderations: (Pick<PostModeration, 'id' | 'decision' | 'comment' | 'createdAt'> & { moderator: Pick<User, 'name'> })[]
}

// История решений модераторов по посту, свежие сверху: «решение · кто · когда».
export default function PostModerationHistory({ moderations }: PostModerationHistoryProps) {
  if(moderations.length === 0){
    return <p className="ui-meta">Решений по посту ещё не было.</p>;
  }

  return (
    <div className="ui-rows">
      { moderations.map(m => {
        const { label, icon: DecisionIcon, danger } = DECISIONS[m.decision];

        return (
          <div key={m.id} className={danger ? 'ui-note ui-note--danger' : 'ui-note'}>
            <span className="ui-note__label">
              <span className="ui-meta__item">
                <DecisionIcon size={13} />
                { label } · { m.moderator.name } ·{' '}
                <LocalDate value={m.createdAt} />
              </span>
            </span>
            { m.comment ?? '—' }
          </div>
        );
      }) }
    </div>
  );
}

/*
  Подписи без рода: «Одобрено · Some», а не «Одобрил Some» — род по имени не угадываем
*/
const DECISIONS: Record<ModerationDecision, { label: string, icon: Icon, danger: boolean }> = {
  approved:  { label: 'Одобрено',       icon: IconCheck,    danger: false },
  rejected:  { label: 'Отклонено',      icon: IconX,        danger: true },
  blocked:   { label: 'Заблокировано',  icon: IconLock,     danger: true },
  unblocked: { label: 'Разблокировано', icon: IconLockOpen, danger: false },
};
