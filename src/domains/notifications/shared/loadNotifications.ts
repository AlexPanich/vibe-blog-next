import 'server-only';
import { db } from "@/globals/db";
import { comments, messages, notifications, postRatings, postReports, posts, users } from "@/database/schema";
import type { NotificationItemResource } from "@/domains/notifications/dto/notificationResources";
import { describeLatest, describeNotification } from "@/domains/notifications/shared/notificationText";
import { groupKeyOf } from "@/domains/notifications/shared/notificationGroup";
import { and, count, desc, eq, inArray, isNull, lt, sql, type SQL } from "drizzle-orm";

export type NotificationRow = ReturnType<typeof loadNotificationRows>[number];

const PAGE_SIZE = 20;

// Порция колокольчика (unreadOnly) или истории: строки старше beforeId
export function loadNotificationPage(userId: number, beforeId?: number, unreadOnly = false){
  const rows = loadNotificationRows(and(
    eq(notifications.userId, userId),
    beforeId === undefined ? undefined : lt(notifications.id, beforeId),
    unreadOnly ? isNull(notifications.readAt) : undefined
  ), PAGE_SIZE + 1);

  return {
    items: rows.slice(0, PAGE_SIZE).map(toNotificationItem),
    hasMore: rows.length > PAGE_SIZE,
    unread: countUnread(userId)
  };
}

/*
  Строки с тем, что нужно для текста и ссылки при показе: актор и его род, пост сейчас, ветка
  и текст комментария, текущая оценка актора, непрочитанные входящие диалога (спека 51)
*/
export function loadNotificationRows(where: SQL | undefined, limit?: number){
  const query = db.select({
    id: notifications.id,
    userId: notifications.userId,
    type: notifications.type,
    role: notifications.role,
    postId: notifications.postId,
    commentId: notifications.commentId,
    dialogId: notifications.dialogId,
    groupCount: notifications.groupCount,
    actorId: notifications.actorId,
    readAt: notifications.readAt,
    createdAt: notifications.createdAt,
    actorName: users.name,
    actorAvatarKey: users.avatarKey,
    actorGender: users.gender,
    postTitle: posts.title,
    postStatus: posts.status,
    postAuthorId: posts.userId,
    commentImageId: comments.imageId,
    commentContent: comments.content,
    commentDeletedAt: comments.deletedAt,
    commentHiddenAt: comments.hiddenAt,
    ratingValue: postRatings.value,
    postReportResolution: postReports.resolution,
    // Только у message.created: число в тексте — непрочитанные входящие сейчас (спека 51, реш. 7)
    unreadMessages: sql<number>`CASE WHEN ${notifications.type} = 'message.created' THEN (
      SELECT count(*) FROM ${messages} m
      WHERE m.dialog_id = ${notifications.dialogId} AND m.user_id <> ${notifications.userId} AND m.read_at IS NULL
    ) ELSE 0 END`
  })
    .from(notifications)
    .leftJoin(users, eq(users.id, notifications.actorId))
    .leftJoin(posts, eq(posts.id, notifications.postId))
    .leftJoin(comments, eq(comments.id, notifications.commentId))
    .leftJoin(postRatings, and(
      eq(notifications.type, 'post.rated'),
      eq(postRatings.postId, notifications.postId),
      eq(postRatings.userId, notifications.actorId)
    ))
    .leftJoin(postReports, and(
      eq(notifications.type, 'post_report.resolved'),
      eq(postReports.postId, notifications.postId),
      eq(postReports.userId, notifications.userId)
    ))
    .where(where)
    .orderBy(desc(notifications.id));

  return (limit ? query.limit(limit) : query).all();
}

export function toNotificationItem(row: NotificationRow): NotificationItemResource {
  return {
    id: row.id,
    type: row.type,
    actor: row.actorName === null ? null : { name: row.actorName, avatarKey: row.actorAvatarKey },
    ...describeNotification(row),
    groupKey: groupKeyOf(row),
    latest: row.groupCount > 1 && row.type !== 'message.created' ? describeLatest(row) : null,
    read: row.readAt !== null,
    createdAt: row.createdAt
  };
}

export function countUnread(userId: number){
  return db.select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .get()?.n ?? 0;
}

export function loadNotificationItems(ids: number[]){
  return ids.length === 0 ? [] : loadNotificationRows(inArray(notifications.id, ids)).map(row => ({ userId: row.userId, item: toNotificationItem(row) }));
}
