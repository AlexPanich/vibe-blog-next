import 'server-only';
import { db } from "@/globals/db";
import { comments } from "@/database/schema";
import { and, count, isNull } from "drizzle-orm";

/*
  Подзапрос: число видимых комментариев по постам — для «Обсуждаемых» в ленте
*/
export function commentAggregate(){
  return db.select({ postId: comments.postId, total: count().as('comment_count') })
    .from(comments)
    .where(visibleComments())
    .groupBy(comments.postId)
    .as('comment_agg');
}

/*
  Какие комментарии считаются и в порядке «Обсуждаемых», и в цифре на карточке: без удалённых
  и скрытых, комментарии к фото — тоже (спека 34, п. 3). Одно правило — иначе порядок ленты
  расходится с цифрами на карточках
*/
export function visibleComments(){
  return and(isNull(comments.deletedAt), isNull(comments.hiddenAt));
}
