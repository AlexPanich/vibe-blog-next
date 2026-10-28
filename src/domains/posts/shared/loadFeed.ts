import 'server-only';
import { db } from "@/globals/db";
import { postTags, posts, tagFollows, tags, userFollows, users } from "@/database/schema";
import { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { ratingAggregate, withRatings } from "@/domains/posts/shared/postRatings";
import { withCovers } from "@/domains/posts/shared/postImages";
import { blockedWithQueries } from "@/domains/users/exports/userBlocks";
import { and, asc, count, desc, eq, gte, inArray, notInArray, sql, type SQL } from "drizzle-orm";

type FeedConditions = Omit<PostFeedFilterDto, 'limit'>;

/*
  Порция ленты и общее число постов под условиями.
  id порции выбирает core-select с join users — сортировке «по автору» нужна колонка другой
  таблицы, relational API так не умеет. Сами посты с автором и рубриками — relational по id.
  viewerId нужен только ленте подписок (filter.follow); без него она пустая
*/
export async function loadFeed(filter: FeedConditions, offset: number, limit: number, viewerId: number | null = null){
  const where = await feedWhere(filter, viewerId);
  const ratings = ratingAggregate();

  const ids = (await db.select({ id: posts.id })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .leftJoin(ratings, eq(ratings.postId, posts.id))
    .where(where)
    .orderBy(...feedOrder(filter.sort, ratings))
    .limit(limit)
    .offset(offset)).map(row => row.id);

  const [ { total } ] = await db.select({ total: count() }).from(posts).where(where);

  const rows = ids.length === 0 ? [] : await db.query.posts.findMany({
    where: inArray(posts.id, ids),
    with: { author: true, ...POST_TAGS_WITH }
  });

  const byId = new Map((await withCovers(await withRatings(rows))).map(row => [ row.id, { ...row, tags: pickTags(row) } ]));

  return { posts: ids.map(id => byId.get(id)!), total };
}

/*
  Рубрики по слагам из URL: неизвестные отбрасываются, лента фильтруется по остальным
*/
export async function findFeedTags(slugs: string[]){
  return slugs.length === 0 ? [] : db.select().from(tags).where(inArray(tags.slug, slugs));
}

const PERIOD_DAYS = { week: 7, month: 30, year: 365 } as const;

async function feedWhere(filter: FeedConditions, viewerId: number | null): Promise<SQL | undefined> {
  const conditions: (SQL | undefined)[] = [ eq(posts.status, 'published') ];

  if(filter.follow){
    conditions.push(...followConditions(filter.follow, viewerId));
  }

  if(filter.search){
    // lower() в SQLite кириллицу не понижает — lower_ru из globals/db.ts
    const pattern = `%${escapeLike(filter.search.toLocaleLowerCase('ru'))}%`;
    conditions.push(sql`lower_ru(${posts.title} || ' ' || ${posts.content}) LIKE ${pattern} ESCAPE '\\'`);
  }

  if(filter.type){
    conditions.push(eq(posts.type, filter.type));
  }

  if(filter.author){
    conditions.push(eq(posts.userId, filter.author));
  }

  if(filter.period){
    conditions.push(gte(posts.publishedAt, new Date(Date.now() - PERIOD_DAYS[filter.period] * 24 * 60 * 60 * 1000)));
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
  Лента подписок: посты моих авторов, посты хотя бы с одной моей рубрикой («ИЛИ» внутри
  рубрик), both — оба условия сразу («И»); без авторов, с кем у меня блокировка
*/
function followConditions(follow: NonNullable<FeedConditions['follow']>, viewerId: number | null): SQL[] {
  if(viewerId === null){
    return [ sql`0` ];
  }

  // Блокировка в любую сторону (спека 26): через подписку на рубрику такой автор пришёл бы
  const conditions: SQL[] = blockedWithQueries(viewerId).map(query => notInArray(posts.userId, query));

  if(follow !== 'tags'){
    const authors = db.select({ id: userFollows.followingId }).from(userFollows).where(eq(userFollows.followerId, viewerId));
    conditions.push(inArray(posts.userId, authors));
  }

  if(follow !== 'authors'){
    const tagged = db.selectDistinct({ id: postTags.postId })
      .from(postTags)
      .innerJoin(tagFollows, and(eq(tagFollows.tagId, postTags.tagId), eq(tagFollows.userId, viewerId)));
    conditions.push(inArray(posts.id, tagged));
  }

  return conditions;
}

// Последним всегда id: при равных датах порядок стабилен, и смещение не теряет посты
function feedOrder(sort: FeedConditions['sort'], ratings: ReturnType<typeof ratingAggregate>): SQL[] {
  if(sort === 'old'){
    return [ asc(posts.publishedAt), asc(posts.id) ];
  }
  else if(sort === 'rating'){
    // Без оценок — в конце, а не как ноль; при равной средней выше тот, у кого оценок больше
    return [ asc(sql`${ratings.average} IS NULL`), desc(ratings.average), desc(ratings.total), desc(posts.publishedAt), desc(posts.id) ];
  }
  else if(sort === 'author'){
    return [ asc(sql`sort_ru(${users.name})`), asc(users.id), desc(posts.publishedAt), desc(posts.id) ];
  }

  return [ desc(posts.publishedAt), desc(posts.id) ];
}

function escapeLike(value: string){
  return value.replace(/[\\%_]/g, char => `\\${char}`);
}
