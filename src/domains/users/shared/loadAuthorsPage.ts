import 'server-only';
import { db } from "@/globals/db";
import { postRatings, postTags, posts, tags, userFollows, users } from "@/database/schema";
import { AuthorsSort } from "@/domains/users/dto/userRequests";
import { parseRoles } from "@/domains/users/shared/userRoles";
import { authorTopics } from "@/domains/users/shared/authorTopics";
import { textLike } from "@/shared/textLike";
import { and, asc, avg, count, desc, eq, exists, notInArray, sql, type SQL } from "drizzle-orm";
import { cache } from "react";

// Строк списка на странице
export const AUTHORS_PAGE = 20;
// Карточек «Больше всего читателей»
export const AUTHORS_SPOTLIGHT = 3;

// Рубрик у автора в карточке и в строке списка — не больше
const TOPICS = 3;

export type DirectoryAuthor = Awaited<ReturnType<typeof loadAuthorsPage>>['rows'][number];

/*
  Страница /authors (спеки 30, 53): авторы, у кого есть опубликованные посты. Цифры — посты,
  подписчики, взвешенная средняя оценка; рубрики — по опубликованным постам автора, самые
  частые, только показанным. Поиск — по имени без регистра, рубрика — есть пост с ней.
  Без поиска и рубрики — три самых читаемых карточками (только на первой странице), список и
  пагинация — по остальным. С поиском или рубрикой карточек нет. Страница за пределами — последняя.
  total — общее число авторов вместе с карточками, для подзаголовка
*/
export const loadAuthorsPage = cache(async (sort: AuthorsSort, q: string | undefined, tag: string | undefined, page: number) => {
  const filtered = Boolean(q || tag);
  // Тройка считается на любой странице: на первой это карточки, на остальных — id для исключения
  const top = filtered ? [] : await select(undefined, 'popular').limit(AUTHORS_SPOTLIGHT);
  const listWhere = and(...conditions(q, tag), top.length > 0 ? notInArray(users.id, top.map(row => row.id)) : undefined);
  const listTotal = await countAuthors(listWhere);
  const pages = Math.max(1, Math.ceil(listTotal / AUTHORS_PAGE));
  const current = Math.min(page, pages);
  const rows = listTotal === 0 ? [] : await select(listWhere, sort).limit(AUTHORS_PAGE).offset((current - 1) * AUTHORS_PAGE);
  const spotlight = current === 1 ? top : [];
  const topics = authorTopics(db, [ ...spotlight, ...rows ].map(row => row.id), TOPICS);
  const toAuthor = (row: typeof rows[number]) => ({
    ...row,
    roles: parseRoles(row.roles),
    ratingAverage: row.ratingAverage === null ? null : Number(row.ratingAverage),
    topics: topics.get(row.id) ?? []
  });

  return {
    spotlight: spotlight.map(toAuthor),
    rows: rows.map(toAuthor),
    total: listTotal + top.length,
    page: current,
    pages
  };
});

// Подзапросы цифр автора; на каждый запрос — свои
function subqueries(){
  const published = db.select({ userId: posts.userId, n: count().as('posts_n') })
    .from(posts)
    .where(eq(posts.status, 'published'))
    .groupBy(posts.userId)
    .as('published');
  const followers = db.select({ userId: userFollows.followingId, n: count().as('followers_n') })
    .from(userFollows)
    .groupBy(userFollows.followingId)
    .as('followers');
  // avg по всем оценкам опубликованных постов: пост с 20 оценками весит больше поста с двумя
  const ratings = db.select({ userId: posts.userId, average: avg(postRatings.value).as('rating_avg') })
    .from(postRatings)
    .innerJoin(posts, and(eq(posts.id, postRatings.postId), eq(posts.status, 'published')))
    .groupBy(posts.userId)
    .as('ratings');

  return { published, followers, ratings, followersCount: sql<number>`coalesce(${followers.n}, 0)` };
}

function conditions(q: string | undefined, tag: string | undefined){
  const list: (SQL | undefined)[] = [];

  if(q){
    list.push(textLike(users.name, q));
  }

  if(tag){
    list.push(exists(db.select({ one: sql`1` })
      .from(posts)
      .innerJoin(postTags, eq(postTags.postId, posts.id))
      .innerJoin(tags, eq(tags.id, postTags.tagId))
      .where(and(eq(posts.userId, users.id), eq(posts.status, 'published'), eq(tags.slug, tag)))));
  }

  return list;
}

// Строки авторов без limit — его добавляет вызывающий
function select(where: SQL | undefined, sort: AuthorsSort){
  const { published, followers, ratings, followersCount } = subqueries();

  return db.select({
    id: users.id,
    name: users.name,
    avatarKey: users.avatarKey,
    coverKey: users.coverKey,
    bio: users.bio,
    roles: users.roles,
    postsCount: published.n,
    followersCount,
    ratingAverage: ratings.average
  })
    .from(users)
    .innerJoin(published, eq(published.userId, users.id))
    .leftJoin(followers, eq(followers.userId, users.id))
    .leftJoin(ratings, eq(ratings.userId, users.id))
    .where(where)
    .orderBy(...order(sort, { posts: published.n, followers: followersCount, rating: ratings.average }));
}

// followers и ratings — left join, на число не влияют
async function countAuthors(where: SQL | undefined){
  const { published } = subqueries();
  const [ row ] = await db.select({ n: count() })
    .from(users)
    .innerJoin(published, eq(published.userId, users.id))
    .where(where);

  return row.n;
}

function order(sort: AuthorsSort, by: { posts: SQL.Aliased<number>, followers: SQL<number>, rating: SQL.Aliased<string | null> }){
  const byName = [ asc(sql`sort_ru(${users.name})`), asc(users.id) ];

  if(sort === 'posts'){
    return [ desc(by.posts), ...byName ];
  }
  else if(sort === 'rating'){
    return [ asc(sql`${by.rating} IS NULL`), desc(by.rating), ...byName ];
  }
  else if(sort === 'name'){
    return byName;
  }

  return [ desc(by.followers), desc(by.posts), ...byName ];
}
