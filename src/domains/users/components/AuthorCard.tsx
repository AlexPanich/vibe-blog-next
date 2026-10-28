import LocalDate from "@/components/general/LocalDate";
import UserAvatar from "@/domains/users/components/UserAvatar";
import { AuthorCardResource } from "@/domains/users/dto/userResources";
import { IconArticle, IconCalendar, IconStarFilled } from "@tabler/icons-react";
import Link from "next/link";

// Карточка автора: сколько опубликовано и куда перейти.
export default function AuthorCard({ author }: { author: AuthorCardResource }) {
  return <article className="ui-card">
    <div className="ui-card__person">
      <UserAvatar name={author.name} avatarKey={author.avatarKey} size={48} />
      <h3 className="ui-card__title">
        <Link href={`/authors/${author.id}`}>{ author.name }</Link>
      </h3>
    </div>
    <div className="ui-meta">
      <span className="ui-meta__item">
        <IconArticle size={13} stroke={1.8} />Постов: { author.postsCount }
      </span>
      { author.ratingAverage !== null && <span className="ui-meta__item" title="Средняя оценка постов">
        <IconStarFilled size={13} className="ui-star" />
        { author.ratingAverage.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }
      </span> }
      <span className="ui-meta__item">
        <IconCalendar size={13} stroke={1.8} />
        С нами с <LocalDate value={author.createdAt} options={{ dateStyle: 'medium' }} />
      </span>
    </div>
    <div className="ui-card__foot">
      <Link href={`/posts?author=${author.id}`} className="ui-backlink">Посты в ленте</Link>
      <Link href={`/authors/${author.id}`} className="ui-backlink">Страница автора</Link>
    </div>
  </article>
}
