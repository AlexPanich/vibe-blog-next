import { db } from "@/globals/db";
import { postRatings, posts, users } from "@/database/schema";
import AuthorCard from "@/domains/users/components/AuthorCard";
import { resource } from "@/core/resource";
import { authorCardResource } from "@/domains/users/dto/userResources";
import { authorsFilterDto } from "@/domains/users/dto/userRequests";
import { and, asc, avg, countDistinct, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { IconUsers } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Авторы' };

export default async function Authros({ searchParams }: PageProps<'/authors'>) {
  const { sort } = authorsFilterDto.parse(await searchParams);
  const byName = asc(sql`sort_ru(${users.name})`);
  const postsCount = countDistinct(posts.id);
  // avg по всем оценкам опубликованных постов — взвешенная средняя: пост с 20 оценками весит больше поста с двумя
  const ratingAverage = avg(postRatings.value);
  const order = {
    name: [ byName ],
    posts: [ desc(postsCount), byName ],
    rating: [ asc(sql`${ratingAverage} IS NULL`), desc(ratingAverage), byName ]
  };

  // Автор — тот, у кого есть опубликованные посты; inner join отсекает остальных
  const rows = await db.select({ id: users.id, name: users.name, avatarKey: users.avatarKey, createdAt: users.createdAt, postsCount, ratingAverage })
    .from(users)
    .innerJoin(posts, and(eq(posts.userId, users.id), eq(posts.status, 'published')))
    .leftJoin(postRatings, eq(postRatings.postId, posts.id))
    .groupBy(users.id)
    .orderBy(...order[sort]);
  const authors = rows.map(row => ({ ...row, ratingAverage: row.ratingAverage === null ? null : Number(row.ratingAverage) }));

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title ui-title--lg">Авторы</h1>
        <span className="ui-kicker">Всего: { authors.length }</span>
      </div>

      <nav className="ui-filter">
        <Link href="/authors" data-active={sort === 'name'}>По имени</Link>
        <Link href="/authors?sort=posts" data-active={sort === 'posts'}>По числу постов</Link>
        <Link href="/authors?sort=rating" data-active={sort === 'rating'}>По рейтингу</Link>
      </nav>

      { authors.length === 0 ? (
        <div className="ui-empty">
          <IconUsers size={26} stroke={1.6} />
          <p>Пока никто ничего не опубликовал.</p>
        </div>
      ) : (
        <div className="ui-grid" style={{ marginTop: '1.25rem' }}>
          { authors.map(author => <AuthorCard key={author.id} author={resource(authorCardResource, author)} />) }
        </div>
      ) }
    </>
  );
}
