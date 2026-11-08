import 'server-only';
import { db } from "@/globals/db";
import { userFollows } from "@/database/schema";
import { and, count, eq, gte } from "drizzle-orm";

const DAY = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;

/*
  Подписчики автора для плиток «Начала» (спека 42): всего, по дням за последние 7 дней
  (сегодня — последний) и сумма за прошлую неделю — для роста в процентах.
  Дни — по часам сервера: столбики рисует сервер, браузерного пояса он не знает
*/
export function followerStats(userId: number, now = new Date()){
  const today = startOfDay(now);
  const from = new Date(today.getTime() - (2 * WEEK_DAYS - 1) * DAY);
  const total = db.select({ n: count() }).from(userFollows).where(eq(userFollows.followingId, userId)).get()?.n ?? 0;
  const recent = db.select({ createdAt: userFollows.createdAt })
    .from(userFollows)
    .where(and(eq(userFollows.followingId, userId), gte(userFollows.createdAt, from)))
    .all();
  const days = Array.from({ length: WEEK_DAYS }, (_, i) => ({ date: new Date(today.getTime() - (WEEK_DAYS - 1 - i) * DAY), n: 0 }));
  let previousWeek = 0;

  for(const { createdAt } of recent){
    const index = Math.round((startOfDay(createdAt).getTime() - days[0].date.getTime()) / DAY);

    if(index >= 0){
      days[index].n++;
    }
    else{
      previousWeek++;
    }
  }

  return { total, days, week: days.reduce((sum, day) => sum + day.n, 0), previousWeek };
}

export type FollowerStats = ReturnType<typeof followerStats>

function startOfDay(date: Date){
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  return day;
}
