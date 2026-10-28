import 'server-only';
import { postTags, posts, tagFollows, userFollows } from "@/database/schema";
import type { NotificationType } from "@/database/schema";
import { deleteSubmittedNotifications, notify, staffIds, type DBTransaction } from "@/domains/notifications/exports/notify";
import { POST_TRANSITIONS, type PostTransition } from "@/domains/posts/shared/postStatuses";
import { eq, inArray } from "drizzle-orm";

// Решения модератора — автору поста
const DECISION_TYPES: Partial<Record<PostTransition, NotificationType>> = {
  approve: 'post.approved',
  reject: 'post.rejected',
  block: 'post.blocked',
  blockArchived: 'post.blocked',
  unblock: 'post.unblocked',
};

/*
  Уведомления перехода, в транзакции смены статуса. Уход из moderating убирает задачу
  post.submitted у всех staff. Подписчикам — только первая публикация: firstPublished
  отмечает changePostStatus (publishedAt)
*/
export function notifyPostTransition(tx: DBTransaction, postId: number, transition: PostTransition, actorId: number, firstPublished: boolean): number[] {
  const post = tx.select({ userId: posts.userId }).from(posts).where(eq(posts.id, postId)).get();

  if(!post){
    return [];
  }

  if(POST_TRANSITIONS[transition].from === 'moderating'){
    deleteSubmittedNotifications(tx, postId);
  }

  if(transition === 'submit'){
    return notify(tx, 'post.submitted', staffIds(tx).filter(id => id !== post.userId), { actorId, postId });
  }

  const type = DECISION_TYPES[transition];
  const ids = type ? notify(tx, type, [ post.userId ], { actorId, postId }) : [];

  if(firstPublished){
    ids.push(...notify(tx, 'post.published', subscriberIds(tx, postId, post.userId), { actorId: post.userId, postId }));
  }

  return ids;
}

// Подписчики автора и рубрик поста; подписан на то и другое — одно уведомление (notify убирает повторы)
function subscriberIds(tx: DBTransaction, postId: number, authorId: number){
  const authorFollowers = tx.select({ id: userFollows.followerId }).from(userFollows).where(eq(userFollows.followingId, authorId)).all();
  const tagIds = tx.select({ id: postTags.tagId }).from(postTags).where(eq(postTags.postId, postId)).all().map(t => t.id);
  const tagFollowers = tagIds.length === 0 ? [] : tx.select({ id: tagFollows.userId }).from(tagFollows).where(inArray(tagFollows.tagId, tagIds)).all();

  return [ ...authorFollowers, ...tagFollowers ].map(f => f.id);
}
