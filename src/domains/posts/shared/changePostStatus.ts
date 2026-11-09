import 'server-only';
import { db } from "@/globals/db";
import { posts } from "@/database/schema";
import { actionError } from "@/globals/actionClient";
import { POST_TRANSITIONS, PostTransition } from "@/domains/posts/shared/postStatuses";
import { notifyPostTransition } from "@/domains/posts/shared/postNotifications";
import { settlePostReports } from "@/domains/posts/shared/postReports";
import { publishNotifications } from "@/domains/notifications/exports/notify";
import { liveBus } from "@/globals/liveBus";
import { and, eq, isNull, type SQL } from "drizzle-orm";

type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/*
  Атомарный переход: статус меняется, только если пост всё ещё в статусе from (и выполнено
  guard — например, «ревью ведёт не другой модератор»). also выполняется в той же транзакции
  (запись в историю модерации). Блокировка и уход в черновик закрывают жалобы на пост
  (settlePostReports, спека 36). Смена статуса всегда снимает ревьюера: ревью — только внутри
  moderating. Первое одобрение ставит publishedAt — дату в ленте «Новые» (спека 22).
  Уведомления перехода пишутся в той же транзакции, а в браузер уходят после commit, туда же
  — широковещательный post.published. Уход из published снимает выбор редакции в том же
  UPDATE (спека 39); restore и unblock его не возвращают. Каждый переход в moderating ставит
  submittedAt — время последней отправки, ключ очереди (спека 49). Права проверяет вызывающий.
*/
export function changePostStatus(postId: number, transition: PostTransition, actorId: number, also?: (tx: DBTransaction) => void, guard?: SQL){
  const { from, to } = POST_TRANSITIONS[transition];
  const unfeature = from === 'published' ? { featuredAt: null, featuredBy: null } : {};
  const submitted = to === 'moderating' ? { submittedAt: new Date() } : {};

  const { notificationIds, authorId, firstPublished } = db.transaction(tx => {
    const [ changed ] = tx.update(posts)
      .set({ status: to, reviewerId: null, reviewStartedAt: null, ...unfeature, ...submitted })
      .where(and(eq(posts.id, postId), eq(posts.status, from), guard))
      .returning({ userId: posts.userId })
      .all();

    if(!changed){
      actionError(409, guard ? 'Пост уже изменился — обновите страницу' : 'Статус поста уже изменился — обновите страницу');
    }

    also?.(tx);

    const firstPublished = transition === 'approve' && markFirstPublished(tx, postId);

    const reportNotificationIds = settlePostReports(tx, postId, transition, actorId);

    return {
      notificationIds: [ ...reportNotificationIds, ...notifyPostTransition(tx, postId, transition, actorId, firstPublished) ],
      authorId: changed.userId,
      firstPublished
    };
  });

  publishNotifications(notificationIds);

  if(firstPublished){
    // Автор и одобривший и так знают — плашка «Новые посты» им не нужна
    liveBus.broadcast('post.published', { postId }, [ authorId, actorId ]);
  }
}

// Дата первой публикации ставится один раз: повторное одобрение после снятия её не двигает
function markFirstPublished(tx: DBTransaction, postId: number){
  return tx.update(posts)
    .set({ publishedAt: new Date() })
    .where(and(eq(posts.id, postId), isNull(posts.publishedAt)))
    .returning({ id: posts.id })
    .all().length > 0;
}
