import 'server-only';
import { db } from "@/globals/db";
import { notifications, users } from "@/database/schema";
import type { NotificationType, Role } from "@/database/schema";
import { blockedAmong } from "@/domains/users/exports/userBlocks";
import { banActiveSql } from "@/shared/userBan";
import { and, desc, eq, gt, inArray, isNull, like, not, or, sql } from "drizzle-orm";

export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type NotifyTarget = {
  actorId: number | null,
  postId?: number | null,
  commentId?: number | null,
  dialogId?: number | null,
  role?: Role | null
}

// Хвост на получателя: старшие удаляются вместе с непрочитанными
export const NOTIFICATIONS_PER_USER = 200;

// Строк в одном INSERT: у SQLite лимит параметров на запрос
const INSERT_CHUNK = 500;

/*
  Социальные события: между людьми, связанными блокировкой, не создаются и при блокировке
  удаляются (спека 26). Модерация и роли сюда не входят — блокировка на них не влияет
*/
const SOCIAL_TYPES: readonly NotificationType[] = [ 'comment.created', 'comment.reply', 'post.published', 'message.created', 'post.rated', 'user.followed' ];

/*
  Группируемые типы (спека 51): одна непрочитанная строка на получателя и пост — или на
  получателя. message.created здесь нет: у сообщений своё правило (messageNotifications.ts)
*/
const GROUP_KEYS: Partial<Record<NotificationType, 'post' | 'user'>> = {
  'comment.created': 'post',
  'comment.reply': 'post',
  'post.rated': 'post',
  'user.followed': 'user',
};

/*
  Пишется в транзакции действия: откат действия откатывает и уведомление. «Не себе» —
  актор из получателей выбрасывается. Возвращает id созданных: их публикует вызывающий
  после commit (publishNotifications).
  Группируемый тип заменяет висящую непрочитанную строку группы: старая удаляется, новая
  встаёт наверх с groupCount + 1 и свежим актором (спека 51, реш. 6)
*/
export function notify(tx: DBTransaction, type: NotificationType, recipients: number[], target: NotifyTarget): number[] {
  const unique = [ ...new Set(recipients) ].filter(id => id !== target.actorId);
  const blocked = target.actorId !== null && SOCIAL_TYPES.includes(type) ? blockedAmong(tx, target.actorId, unique) : [];
  const userIds = unique.filter(id => !blocked.includes(id));

  if(userIds.length === 0){
    return [];
  }

  const createdAt = new Date();
  const rows = userIds.map(userId => ({
    userId,
    type,
    actorId: target.actorId,
    postId: target.postId ?? null,
    commentId: target.commentId ?? null,
    dialogId: target.dialogId ?? null,
    role: target.role ?? null,
    groupCount: groupCountFor(tx, type, userId, target),
    createdAt
  }));
  const ids: number[] = [];

  for(let i = 0; i < rows.length; i += INSERT_CHUNK){
    ids.push(...tx.insert(notifications).values(rows.slice(i, i + INSERT_CHUNK)).returning({ id: notifications.id }).all().map(r => r.id));
  }

  trimTail(tx, userIds);

  return ids;
}

// moderator и admin без бана — получатели задач модерации
export function staffIds(tx: DBTransaction): number[] {
  return tx.select({ id: users.id })
    .from(users)
    .where(and(not(banActiveSql()), or(like(users.roles, '%"moderator"%'), like(users.roles, '%"admin"%'))))
    .all()
    .map(u => u.id);
}

// admin без бана — получатели заявок на роль автора (спека 28)
export function adminIds(tx: DBTransaction): number[] {
  return tx.select({ id: users.id })
    .from(users)
    .where(and(not(banActiveSql()), like(users.roles, '%"admin"%')))
    .all()
    .map(u => u.id);
}

/*
  Уборка. Уведомления удалённого комментария уходят вместе с ним, а группа теряет одно
  событие и выдержку (спека 51, реш. 8): строка помнит только последний commentId, поэтому
  комментарий из середины группы счёт не уменьшает. Задачи — post.submitted и report.created,
  post_report.created — уходят, когда их сделали: это не факты, а работа, которой больше нет
*/
export function deleteCommentNotifications(tx: DBTransaction, commentIds: number[]){
  if(commentIds.length > 0){
    tx.delete(notifications).where(and(inArray(notifications.commentId, commentIds), eq(notifications.groupCount, 1))).run();
    tx.update(notifications)
      .set({ groupCount: sql`${notifications.groupCount} - 1`, commentId: null })
      .where(and(inArray(notifications.commentId, commentIds), gt(notifications.groupCount, 1)))
      .run();
  }
}

export function deleteReportNotifications(tx: DBTransaction, commentId: number){
  tx.delete(notifications).where(and(eq(notifications.type, 'report.created'), eq(notifications.commentId, commentId))).run();
}

// Задача «жалоба на пост» — одна на пост у всех staff (спека 36)
export function deletePostReportNotifications(tx: DBTransaction, postId: number){
  tx.delete(notifications).where(and(eq(notifications.type, 'post_report.created'), eq(notifications.postId, postId))).run();
}

export function deleteSubmittedNotifications(tx: DBTransaction, postId: number){
  tx.delete(notifications).where(and(eq(notifications.type, 'post.submitted'), eq(notifications.postId, postId))).run();
}

// Задача «заявка на роль автора» — у всех admin, актор — заявитель: ожидающая заявка у него одна
export function deleteAuthorRequestNotifications(tx: DBTransaction, applicantId: number){
  tx.delete(notifications).where(and(eq(notifications.type, 'author_request.created'), eq(notifications.actorId, applicantId))).run();
}

// Блокировка: висящие социальные уведомления между двумя — в обе стороны
export function deleteSocialNotificationsBetween(tx: DBTransaction, a: number, b: number){
  tx.delete(notifications)
    .where(and(
      inArray(notifications.type, [ ...SOCIAL_TYPES ]),
      or(
        and(eq(notifications.userId, a), eq(notifications.actorId, b)),
        and(eq(notifications.userId, b), eq(notifications.actorId, a))
      )
    ))
    .run();
}

/*
  Счёт новой строки группы: висящая непрочитанная удаляется, счёт продолжается. Тот же актор,
  что у висящей, счёт не увеличивает — повторная оценка через сутки или два комментария
  подряд не дают «и ещё 1» (план 51, реш. 2)
*/
function groupCountFor(tx: DBTransaction, type: NotificationType, userId: number, target: NotifyTarget): number {
  const key = GROUP_KEYS[type];

  if(!key || (key === 'post' && target.postId == null)){
    return 1;
  }

  const open = tx.select({ id: notifications.id, groupCount: notifications.groupCount, actorId: notifications.actorId })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.type, type),
      isNull(notifications.readAt),
      key === 'post' ? eq(notifications.postId, target.postId!) : undefined
    ))
    .orderBy(desc(notifications.id))
    .get();

  if(!open){
    return 1;
  }

  tx.delete(notifications).where(eq(notifications.id, open.id)).run();

  return open.actorId === target.actorId ? open.groupCount : open.groupCount + 1;
}

function trimTail(tx: DBTransaction, userIds: number[]){
  tx.run(sql`
    DELETE FROM ${notifications} WHERE ${notifications.id} IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id DESC) AS position
        FROM ${notifications}
        WHERE user_id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})
      )
      WHERE position > ${NOTIFICATIONS_PER_USER}
    )
  `);
}
