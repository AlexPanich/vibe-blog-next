import LocalDate from "@/components/general/LocalDate";
import type { ModerationDecision } from "@/database/schema";
import type { PostModeration, User } from "@/database/types";
import PostHistoryToggle from "@/domains/posts/components/PostHistoryToggle";
import { plural } from "@/core/plural";
import { IconCheck, IconEye, IconLock, IconLockOpen, IconPencil, IconX, type Icon } from "@tabler/icons-react";

type PostModerationHistoryProps = {
  post: { createdAt: Date },
  moderations: (Pick<PostModeration, 'id' | 'decision' | 'comment' | 'createdAt'> & { moderator: Pick<User, 'name'> })[],
  // Кто сейчас ведёт ревью — сверху ленты; в таблицу истории взятие не пишется (lifecycle)
  review?: { name: string, mine: boolean, startedAt: Date }
}

/*
  История модерации лентой событий, свежие сверху (спека 42, шаг 14): текущее ревью, решения
  модераторов с комментариями, создание поста. Подписи без рода: «Отклонено · Some», а не
  «Отклонила Some» — род по имени не угадываем
*/
export default function PostModerationHistory({ post, moderations, review }: PostModerationHistoryProps) {
  const events: Event[] = [
    ...(review ? [ {
      key: 'review',
      tone: 'coral',
      icon: IconEye,
      title: review.mine ? 'Вы взяли на ревью' : `На ревью · ${review.name}`,
      at: review.startedAt
    } satisfies Event ] : []),
    ...moderations.map(m => ({
      key: `m${m.id}`,
      ...DECISIONS[m.decision],
      title: `${DECISIONS[m.decision].title} · ${m.moderator.name}`,
      comment: m.comment ?? undefined,
      at: m.createdAt
    })),
    { key: 'created', tone: 'faint', icon: IconPencil, title: 'Пост создан', at: post.createdAt }
  ];

  return (
    <PostHistoryToggle summary={`История модерации · ${events.length} ${plural(events.length, [ 'событие', 'события', 'событий' ])}`}>
      <ol className="ui-mod-events">
        { events.map(({ key, tone, icon: EventIcon, title, comment, at }) => (
          <li key={key} className="ui-mod-event">
            <span className="ui-mod-event__dot" data-tone={tone}><EventIcon size={13} stroke={2.2} /></span>
            <span className="ui-mod-event__text">
              <b>{ title }</b>
              { comment && <q>{ comment }</q> }
              <LocalDate value={at} options={{ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }} />
            </span>
          </li>
        )) }
      </ol>
    </PostHistoryToggle>
  );
}

type Event = {
  key: string,
  tone: 'coral' | 'mint' | 'faint',
  icon: Icon,
  title: string,
  comment?: string,
  at: Date
}

const DECISIONS: Record<ModerationDecision, Pick<Event, 'tone' | 'icon' | 'title'>> = {
  approved:  { title: 'Опубликовано',   icon: IconCheck,    tone: 'mint' },
  rejected:  { title: 'Отклонено',      icon: IconX,        tone: 'coral' },
  blocked:   { title: 'Заблокировано',  icon: IconLock,     tone: 'coral' },
  unblocked: { title: 'Разблокировано', icon: IconLockOpen, tone: 'mint' },
};
