import 'server-only';
import { db } from "@/globals/db";
import { posts, postViewSeen, postViewsDaily } from "@/database/schema";
import { viewsConfig } from "@/config/views";
import { dayDate, shiftDay, viewDay } from "@/domains/posts/shared/postViewDay";
import { and, eq, gte, inArray, lt, sql, sum } from "drizzle-orm";
import { createHash } from "node:crypto";

const WEEK_DAYS = 7;

type Viewer = {
  userId: number | null,
  ip: string,
  userAgent: string
}

/*
  Засчитать просмотр публичной страницы поста (спека 43). Только published и не автор; повтор
  зрителя за сутки не считается. Одна синхронная транзакция: уникальность → +1 в агрегат дня.
  Раз в день (первая запись нового дня в процессе) удаляет уникальность старше вчера
*/
export function recordPostView(postId: number, viewer: Viewer, now = new Date()){
  const day = viewDay(now);

  return db.transaction(tx => {
    const post = tx.select({ status: posts.status, userId: posts.userId }).from(posts).where(eq(posts.id, postId)).get();

    if(post?.status !== 'published' || post.userId === viewer.userId){
      return false;
    }

    if(cleanup.lastDay !== day){
      tx.delete(postViewSeen).where(lt(postViewSeen.day, shiftDay(day, -1))).run();
      cleanup.lastDay = day;
    }

    const seen = tx.insert(postViewSeen)
      .values({ postId, day, viewerHash: viewerKey(viewer, day) })
      .onConflictDoNothing()
      .run();

    if(seen.changes !== 1){
      return false;
    }

    tx.insert(postViewsDaily)
      .values({ postId, day, views: 1 })
      .onConflictDoUpdate({ target: [ postViewsDaily.postId, postViewsDaily.day ], set: { views: sql`${postViewsDaily.views} + 1` } })
      .run();

    return true;
  });
}

// Всего просмотров у постов. Видят только автор (свои) и admin — вызывающий отвечает за это
export function postViewTotals(postIds: number[]){
  const totals = new Map<number, number>();

  if(postIds.length === 0){
    return totals;
  }

  const rows = db.select({ postId: postViewsDaily.postId, views: sum(postViewsDaily.views).mapWith(Number) })
    .from(postViewsDaily)
    .where(inArray(postViewsDaily.postId, postIds))
    .groupBy(postViewsDaily.postId)
    .all();

  for(const row of rows){
    totals.set(row.postId, row.views);
  }

  return totals;
}

/*
  Просмотры постов автора для плитки «Начала» той же формы, что followerStats (спека 43): по дням
  за 7 дней (сегодня — последний) и сумма прошлой недели. Статус поста не фильтруется:
  просмотры архивного поста за неделю были
*/
export function authorViewStats(userId: number, now = new Date()){
  const today = viewDay(now);
  const rows = db.select({ day: postViewsDaily.day, views: sum(postViewsDaily.views).mapWith(Number) })
    .from(postViewsDaily)
    .innerJoin(posts, eq(posts.id, postViewsDaily.postId))
    .where(and(eq(posts.userId, userId), gte(postViewsDaily.day, shiftDay(today, -(2 * WEEK_DAYS - 1)))))
    .groupBy(postViewsDaily.day)
    .all();
  const byDay = new Map(rows.map(row => [ row.day, row.views ]));
  const days = Array.from({ length: WEEK_DAYS }, (_, i) => {
    const day = shiftDay(today, i - (WEEK_DAYS - 1));

    return { date: dayDate(day), n: byDay.get(day) ?? 0 };
  });
  const firstDay = shiftDay(today, -(WEEK_DAYS - 1));
  const previousWeek = rows.filter(row => row.day < firstDay).reduce((total, row) => total + row.views, 0);

  return { days, week: days.reduce((total, day) => total + day.n, 0), previousWeek };
}

export type AuthorViewStats = ReturnType<typeof authorViewStats>

// Последний день очистки уникальности — в globalThis, чтобы HMR не сбрасывал
const cleanup = ((globalThis as { __postViewCleanup?: { lastDay: string | null } }).__postViewCleanup ??= { lastDay: null });

// Вошедший — `u:<id>` (строка живёт ≤ 2 суток, id не секрет), гость — хеш соли, IP, UA и дня: сырые IP и UA не храним
function viewerKey(viewer: Viewer, day: string){
  if(viewer.userId !== null){
    return `u:${viewer.userId}`;
  }

  return 'g:' + createHash('sha256').update([ viewsConfig.salt, viewer.ip, viewer.userAgent, day ].join('|')).digest('hex');
}
