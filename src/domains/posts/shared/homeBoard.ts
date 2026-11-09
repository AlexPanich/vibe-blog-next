import 'server-only';
import { db } from "@/globals/db";
import { posts } from "@/database/schema";
import { POST_TAGS_WITH, pickTags } from "@/domains/posts/shared/postTags";
import { ratingAggregate } from "@/domains/posts/shared/postRatings";
import { withCardData } from "@/domains/posts/shared/postCards";
import { editorsPickSince, type HomePick } from "@/domains/posts/shared/editorsPick";
import { and, count, desc, eq, gte, inArray, notInArray } from "drizzle-orm";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/*
  Главная (спека 30): большой пост и свежие посты под ним. Большой пост — ручной «Выбор
  редакции» за последние 7 дней (спека 39), без него — опубликованный за неделю пост с лучшей
  средней оценкой (при равенстве — у кого оценок больше), метка «Лучшее за неделю». За неделю
  никого не оценили — первым идёт просто самый свежий пост, без метки
*/
export async function homeFresh(cards: number){
  const editor = await editorsPick();
  const featuredId = editor ?? await weekPick();
  const pick: HomePick = editor !== null ? 'editor' : featuredId !== null ? 'week' : null;
  const fresh = await db.select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.status, 'published'), featuredId === null ? undefined : notInArray(posts.id, [ featuredId ])))
    .orderBy(desc(posts.publishedAt), desc(posts.id))
    .limit(featuredId === null ? cards + 1 : cards);
  const ids = [ ...(featuredId === null ? [] : [ featuredId ]), ...fresh.map(row => row.id) ];

  if(ids.length === 0){
    return { featured: null, pick, cards: [] };
  }

  const rows = await db.query.posts.findMany({ where: inArray(posts.id, ids), with: { author: true, ...POST_TAGS_WITH } });
  const byId = new Map((await withCardData(rows)).map(row => [ row.id, { ...row, tags: pickTags(row) } ]));
  const [ featured, ...rest ] = ids.map(id => byId.get(id)!);

  return { featured, pick, cards: rest };
}

// Сколько постов вышло за неделю — плашка на первом экране
export async function weekPostsCount(){
  const [ { n } ] = await db.select({ n: count() })
    .from(posts)
    .where(and(eq(posts.status, 'published'), gte(posts.publishedAt, weekAgo())));

  return n;
}

async function editorsPick(){
  const [ row ] = await db.select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.status, 'published'), gte(posts.featuredAt, editorsPickSince())))
    .orderBy(desc(posts.featuredAt))
    .limit(1);

  return row?.id ?? null;
}

async function weekPick(){
  const agg = ratingAggregate();
  const [ row ] = await db.select({ id: posts.id })
    .from(posts)
    .innerJoin(agg, eq(agg.postId, posts.id))
    .where(and(eq(posts.status, 'published'), gte(posts.publishedAt, weekAgo())))
    .orderBy(desc(agg.average), desc(agg.total), desc(posts.publishedAt), desc(posts.id))
    .limit(1);

  return row?.id ?? null;
}

function weekAgo(){
  return new Date(Date.now() - WEEK_MS);
}
