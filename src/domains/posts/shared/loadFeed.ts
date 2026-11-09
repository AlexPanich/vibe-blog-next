import 'server-only';
import { db } from "@/globals/db";
import { postRatings, postTags, posts, tagFollows, tags, userFollows, users } from "@/database/schema";
import { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { ratingAggregate } from "@/domains/posts/shared/postRatings";
import { commentAggregate } from "@/domains/posts/shared/postComments";
import { feedPeriod } from "@/domains/posts/shared/feedPeriod";
import { withCardData } from "@/domains/posts/shared/postCards";
import { blockedWithQueries } from "@/domains/users/exports/userBlocks";
import { escapeLike } from "@/shared/escapeLike";
import { and, asc, count, desc, eq, gte, inArray, notInArray, or, sql, type SQL } from "drizzle-orm";
import type { SQLiteSelect } from "drizzle-orm/sqlite-core";

type FeedConditions = Omit<PostFeedFilterDto, 'limit'>;

/*
  Порция ленты и общее число постов под условиями.
  id порции выбирает core-select с join users — сортировке «по автору» нужна колонка другой
  таблицы, relational API так не умеет. Сами посты с автором и рубриками — relational по id.
  viewerId нужен только ленте подписок (filter.follow); без него она пустая
*/
export async function loadFeed(filter: FeedConditions, offset: number, limit: number, viewerId: number | null = null){
  const where = await feedWhere(filter, viewerId);
  const query = db.select({ id: posts.id })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(where)
    .$dynamic();

  const ids = (await applyFeedSort(query, filter.sort).limit(limit).offset(offset)).map(row => row.id);

  const [ { total } ] = await db.select({ total: count() }).from(posts).where(where);

  const rows = ids.length === 0 ? [] : await db.query.posts.findMany({
    where: inArray(posts.id, ids),
    with: { author: true, ...POST_TAGS_WITH }
  });

  const byId = new Map((await withCardData(rows)).map(row => [ row.id, { ...row, tags: pickTags(row) } ]));

  return { posts: ids.map(id => byId.get(id)!), total };
}

/*
  Рубрики по слагам из URL: неизвестные отбрасываются, лента фильтруется по остальным
*/
export async function findFeedTags(slugs: string[]){
  return slugs.length === 0 ? [] : db.select().from(tags).where(inArray(tags.slug, slugs));
}

const PERIOD_DAYS = { week: 7, month: 30, year: 365 } as const;

// Вес средней по сайту в «Популярных»: столько «средних» оценок добавляется каждому посту
const BAYES_WEIGHT = 5;

async function feedWhere(filter: FeedConditions, viewerId: number | null): Promise<SQL | undefined> {
  const conditions: (SQL | undefined)[] = [ eq(posts.status, 'published') ];

  if(filter.follow){
    conditions.push(...followConditions(viewerId));
  }

  if(filter.search){
    /*
      lower() в SQLite кириллицу не понижает — lower_ru из globals/db.ts. lead может быть NULL,
      а конкатенация с NULL даёт NULL — отсюда coalesce (спека 35)
    */
    const pattern = `%${escapeLike(filter.search.toLocaleLowerCase('ru'))}%`;
    conditions.push(sql`lower_ru(${posts.title} || ' ' || coalesce(${posts.lead}, '') || ' ' || ${posts.content}) LIKE ${pattern} ESCAPE '\\'`);
  }

  if(filter.type){
    conditions.push(eq(posts.type, filter.type));
  }

  if(filter.author){
    conditions.push(eq(posts.userId, filter.author));
  }

  const period = feedPeriod(filter);

  if(period !== 'all'){
    conditions.push(gte(posts.publishedAt, new Date(Date.now() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000)));
  }

  const tagIds = (await findFeedTags(filter.tag)).map(tag => tag.id);

  if(tagIds.length > 0){
    // Логика «И»: у поста должны быть все выбранные рубрики
    const withAllTags = db.select({ id: postTags.postId })
      .from(postTags)
      .where(inArray(postTags.tagId, tagIds))
      .groupBy(postTags.postId)
      .having(sql`count(*) = ${tagIds.length}`);

    conditions.push(inArray(posts.id, withAllTags));
  }

  return and(...conditions);
}

/*
  Лента подписок: посты моих авторов или посты хотя бы с одной моей рубрикой («ИЛИ»);
  без авторов, с кем у меня блокировка
*/
function followConditions(viewerId: number | null): (SQL | undefined)[] {
  if(viewerId === null){
    return [ sql`0` ];
  }

  // Блокировка в любую сторону (спека 26): через подписку на рубрику такой автор пришёл бы
  const conditions: (SQL | undefined)[] = blockedWithQueries(viewerId).map(query => notInArray(posts.userId, query));
  const authors = db.select({ id: userFollows.followingId }).from(userFollows).where(eq(userFollows.followerId, viewerId));
  const tagged = db.selectDistinct({ id: postTags.postId })
    .from(postTags)
    .innerJoin(tagFollows, and(eq(tagFollows.tagId, postTags.tagId), eq(tagFollows.userId, viewerId)));

  conditions.push(or(inArray(posts.userId, authors), inArray(posts.id, tagged)));

  return conditions;
}

/*
  Порядок ленты; агрегат join-ится только своей сортировке. Dynamic-запрос drizzle меняется
  на месте: join меняет его тип, но не объект — поэтому join отдельной строкой.
  Последним всегда id: при равных датах порядок стабилен, и смещение не теряет посты
*/
function applyFeedSort<T extends SQLiteSelect>(query: T, sort: FeedConditions['sort']): T {
  if(sort === 'popular'){
    // Средняя по Байесу (спека 34, п. 2): (C·m + Σ) / (C + n), m — средняя по сайту.
    // Без оценок — в конце, при равенстве — новее выше
    const ratings = ratingAggregate();
    const score = sql`(${BAYES_WEIGHT} * (SELECT avg(${postRatings.value}) FROM ${postRatings}) + ${ratings.sum}) * 1.0 / (${BAYES_WEIGHT} + ${ratings.total})`;

    query.leftJoin(ratings, eq(ratings.postId, posts.id));

    return query.orderBy(asc(sql`${ratings.total} IS NULL`), desc(score), desc(posts.publishedAt), desc(posts.id));
  }
  else if(sort === 'discussed'){
    const commentCounts = commentAggregate();

    query.leftJoin(commentCounts, eq(commentCounts.postId, posts.id));

    return query.orderBy(desc(sql`coalesce(${commentCounts.total}, 0)`), desc(posts.publishedAt), desc(posts.id));
  }
  else if(sort === 'old'){
    return query.orderBy(asc(posts.publishedAt), asc(posts.id));
  }
  else if(sort === 'author'){
    return query.orderBy(asc(sql`sort_ru(${users.name})`), asc(users.id), desc(posts.publishedAt), desc(posts.id));
  }

  return query.orderBy(desc(posts.publishedAt), desc(posts.id));
}
