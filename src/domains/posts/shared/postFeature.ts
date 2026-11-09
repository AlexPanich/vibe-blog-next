import 'server-only';
import { db } from "@/globals/db";
import { posts } from "@/database/schema";
import { actionError } from "@/globals/actionClient";
import { notify } from "@/domains/notifications/exports/notify";
import { editorsPickSince } from "@/domains/posts/shared/editorsPick";
import { and, eq, isNotNull, isNull, lt, ne, or } from "drizzle-orm";

/*
  Выбор для главной (спека 39). Статус и «ещё не выбран» проверяются в том же UPDATE, как у
  переходов: устаревшая страница получит 409, а повторный выбор не продлит срок и не пришлёт
  второе уведомление. Прежний выбор обнуляется в той же транзакции — ненулевой featuredAt
  остаётся максимум у одного поста. Возвращает id уведомлений: публикует вызывающий после commit
*/
export function pickForHome(postId: number, actorId: number): number[] {
  return db.transaction(tx => {
    const now = new Date();
    const [ picked ] = tx.update(posts)
      .set({ featuredAt: now, featuredBy: actorId })
      .where(and(
        eq(posts.id, postId),
        eq(posts.status, 'published'),
        or(isNull(posts.featuredAt), lt(posts.featuredAt, editorsPickSince(now.getTime())))
      ))
      .returning({ userId: posts.userId })
      .all();

    if(!picked){
      const post = tx.select({ status: posts.status }).from(posts).where(eq(posts.id, postId)).get();

      actionError(409, post?.status === 'published' ? 'Пост уже на главной — обновите страницу' : 'Пост уже не опубликован — обновите страницу');
    }

    tx.update(posts)
      .set({ featuredAt: null, featuredBy: null })
      .where(and(isNotNull(posts.featuredAt), ne(posts.id, postId)))
      .run();

    return notify(tx, 'post.featured', [ picked.userId ], { actorId, postId });
  });
}

/*
  Снять с главной. Повтор (уже снят, протух, пост ушёл из публикации) — то же состояние,
  поэтому без 409 и без проверки статуса. Уведомления при снятии нет (спека 39, п. 6)
*/
export function unpickFromHome(postId: number){
  db.update(posts)
    .set({ featuredAt: null, featuredBy: null })
    .where(eq(posts.id, postId))
    .run();
}
