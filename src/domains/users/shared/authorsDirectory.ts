import 'server-only';
import { db } from "@/globals/db";
import { postRatings, postTags, posts, tags, userFollows, users } from "@/database/schema";
import { AuthorsFilterDto, AuthorsSort } from "@/domains/users/dto/userRequests";
import { parseRoles } from "@/domains/users/shared/userRoles";
import { escapeLike } from "@/shared/escapeLike";
import { and, asc, avg, count, desc, eq, exists, inArray, sql, type SQL } from "drizzle-orm";

// Рубрик у автора в карточке и в строке списка — не больше
const TOPICS = 3;

export type DirectoryAuthor = Awaited<ReturnType<typeof authorsDirectory>>[number];

/*
  Авторы для страницы /authors (спека 30): у кого есть опубликованные посты. Цифры —
  посты, подписчики, взвешенная средняя оценка; рубрики — по опубликованным постам автора,
  самые частые. Поиск — по имени без регистра, рубрика — есть пост с ней
*/
export async function authorsDirectory({ sort, q, tag }: AuthorsFilterDto){
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
  const followersCount = sql<number>`coalesce(${followers.n}, 0)`;
  const conditions: (SQL | undefined)[] = [];

  if(q){
    // lower() в SQLite кириллицу не понижает — lower_ru из globals/db.ts
    conditions.push(sql`lower_ru(${users.name}) LIKE ${`%${escapeLike(q.toLocaleLowerCase('ru'))}%`} ESCAPE '\\'`);
  }

  if(tag){
    conditions.push(exists(db.select({ one: sql`1` })
      .from(posts)
      .innerJoin(postTags, eq(postTags.postId, posts.id))
      .innerJoin(tags, eq(tags.id, postTags.tagId))
      .where(and(eq(posts.userId, users.id), eq(posts.status, 'published'), eq(tags.slug, tag)))));
  }

  const rows = await db.select({
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
    .where(and(...conditions))
    .orderBy(...order(sort, { posts: published.n, followers: followersCount, rating: ratings.average }));
  const topics = await authorTopics(rows.map(row => row.id));

  return rows.map(row => ({
    ...row,
    roles: parseRoles(row.roles),
    ratingAverage: row.ratingAverage === null ? null : Number(row.ratingAverage),
    topics: topics.get(row.id) ?? []
  }));
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

// Самые частые рубрики опубликованных постов каждого автора; при равенстве — по алфавиту
async function authorTopics(userIds: number[]){
  const rows = userIds.length === 0 ? [] : await db.select({ userId: posts.userId, id: tags.id, name: tags.name, slug: tags.slug, n: count() })
    .from(postTags)
    .innerJoin(posts, and(eq(posts.id, postTags.postId), eq(posts.status, 'published')))
    .innerJoin(tags, eq(tags.id, postTags.tagId))
    .where(inArray(posts.userId, userIds))
    .groupBy(posts.userId, tags.id);
  const byUser = new Map<number, { id: number, name: string, slug: string }[]>();
  const sorted = rows.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'ru'));

  for(const { userId, id, name, slug } of sorted){
    const list = byUser.get(userId) ?? [];

    if(list.length < TOPICS){
      byUser.set(userId, [ ...list, { id, name, slug } ]);
    }
  }

  return byUser;
}
