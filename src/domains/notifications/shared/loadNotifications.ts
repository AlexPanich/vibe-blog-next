import 'server-only';
import { db } from "@/globals/db";
import { comments, notifications, posts, users } from "@/database/schema";
import type { NotificationItemResource } from "@/domains/notifications/dto/notificationResources";
import { describeNotification } from "@/domains/notifications/shared/notificationText";
import { and, count, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";

export type NotificationRow = ReturnType<typeof loadNotificationRows>[number];

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
    commentImageId: comments.imageId
  })
    .from(notifications)
    .leftJoin(users, eq(users.id, notifications.actorId))
    .leftJoin(posts, eq(posts.id, notifications.postId))
    .leftJoin(comments, eq(comments.id, notifications.commentId))
    .where(where)
    .orderBy(desc(notifications.id));

  return (limit ? query.limit(limit) : query).all();
}

export function toNotificationItem(row: NotificationRow): NotificationItemResource {
  return {
    id: row.id,
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
