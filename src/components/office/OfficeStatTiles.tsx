import { formatRating } from "@/domains/posts/exports/formatRating";
import { plural } from "@/core/plural";
import { IconMessageCircle, IconStar, IconTrendingUp, IconUsers, type Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

type StatTilesProps = {
  followers: {
    total: number,
    week: number,
    previousWeek: number,
    days: { date: Date, n: number }[]
  },
  rating: { average: number | null, posts: number },
  comments: { total: number, week: number }
}

const WEEKDAY = new Intl.DateTimeFormat('ru', { weekday: 'short' });

/*
  Плитки цифр автора на «Начале» (спека 42). Большая фиолетовая — новые подписчики по дням:
  в макете там просмотры, их пока не считаем (спека 43, тогда плитку переключить)
*/
export default function OfficeStatTiles({ followers, rating, comments }: StatTilesProps) {
  const max = Math.max(1, ...followers.days.map(day => day.n));
  const trend = followers.previousWeek > 0
    ? Math.round((followers.week - followers.previousWeek) / followers.previousWeek * 100)
    : null;

  return (
    <div className="ui-stats">
      <div className="ui-stats__chart">
        <div className="ui-stats__chart-text">
          <span className="ui-stats__chart-label">Подписчики за 7 дней</span>
          <span className="ui-stats__chart-value">{ followers.week }</span>
          { trend !== null && trend !== 0 && <span className="ui-stats__trend">
            <IconTrendingUp size={14} stroke={2} />{ trend > 0 ? '+' : '−' }{ Math.abs(trend) }%
          </span> }
        </div>
        <div className="ui-stats__bars" role="img" aria-label={followers.days.map(day => `${WEEKDAY.format(day.date)}: ${day.n}`).join(', ')}>
          { followers.days.map((day, i) => (
            <span key={day.date.getTime()} className="ui-stats__bar" data-today={i === followers.days.length - 1}>
              <span style={{ height: `${Math.max(6, day.n / max * 100)}%` }} />
              { WEEKDAY.format(day.date) }
            </span>
          )) }
        </div>
      </div>

      <Tile icon={IconUsers} tone="mint" value={followers.total} label="Подписчики">
        +{ followers.week } за неделю
      </Tile>
      <Tile icon={IconStar} tone="sun" value={rating.average === null ? '—' : formatRating(rating.average)} label="Средняя оценка" short="Оценка">
        { rating.posts > 0 ? `по ${rating.posts} ${plural(rating.posts, [ 'посту', 'постам', 'постам' ])}` : 'оценок пока нет' }
      </Tile>
      <Tile icon={IconMessageCircle} tone="coral" value={comments.total} label="Комментарии">
        +{ comments.week } за неделю
      </Tile>
    </div>
  );
}

// short — подпись на телефоне, где плитки втрое уже
function Tile({ icon: TileIcon, tone, value, label, short, children }: { icon: Icon, tone: string, value: ReactNode, label: string, short?: string, children: ReactNode }){
  return (
    <div className="ui-stats__tile">
      <span className="ui-stats__icon" data-tone={tone}><TileIcon size={20} stroke={1.8} /></span>
      <span className="ui-stats__text">
        <span className="ui-stats__value">{ value }</span>
        <span className="ui-stats__label" data-short={short}>{ label }</span>
        <span className="ui-stats__sub">{ children }</span>
      </span>
    </div>
  );
}
