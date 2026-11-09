import 'server-only';
import { db } from "@/globals/db";
import { comments, notifications, postReports, posts, users } from "@/database/schema";
import type { NotificationItemResource } from "@/domains/notifications/dto/notificationResources";
import { describeNotification } from "@/domains/notifications/shared/notificationText";
import { and, count, desc, eq, inArray, isNull, lt, type SQL } from "drizzle-orm";

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
  Строки с тем, что нужно для текста и ссылки при показе: актор, пост сейчас, ветка комментария
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
    readAt: notifications.readAt,
    createdAt: notifications.createdAt,
    actorName: users.name,
    actorAvatarKey: users.avatarKey,
    postTitle: posts.title,
    postStatus: posts.status,
    postAuthorId: posts.userId,
    commentImageId: comments.imageId,
    postReportResolution: postReports.resolution
  })
    .from(notifications)
    .leftJoin(users, eq(users.id, notifications.actorId))
    .leftJoin(posts, eq(posts.id, notifications.postId))
    .leftJoin(comments, eq(comments.id, notifications.commentId))
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
