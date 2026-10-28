import 'server-only';
import { db } from "@/globals/db";
import { commentReactions, comments, users } from "@/database/schema";
import { commentState } from "@/domains/comments/shared/commentState";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

/*
  Ветка поста (imageId = null) или картинки плоским списком, старые сверху, со счётчиками
  реакций. Текст у скрытого и удалённого не отдаётся: результат уходит в HTML для всех
*/
export async function loadComments(postId: number, imageId: number | null){
  const reactions = db.select({
    commentId: commentReactions.commentId,
    likes: sql<number>`sum(${commentReactions.value} = 1)`.as('likes'),
    dislikes: sql<number>`sum(${commentReactions.value} = -1)`.as('dislikes')
  })
    .from(commentReactions)
    .groupBy(commentReactions.commentId)
    .as('reactions');

  const rows = await db.select({
    id: comments.id,
    parentId: comments.parentId,
    userId: comments.userId,
    authorName: users.name,
    authorAvatarKey: users.avatarKey,
    content: comments.content,
    createdAt: comments.createdAt,
    editedAt: comments.editedAt,
    editedBy: comments.editedBy,
    hiddenAt: comments.hiddenAt,
    deletedAt: comments.deletedAt,
    likes: reactions.likes,
    dislikes: reactions.dislikes
  })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .leftJoin(reactions, eq(reactions.commentId, comments.id))
    .where(and(eq(comments.postId, postId), branchOf(imageId)))
    .orderBy(asc(comments.createdAt), asc(comments.id));

  return rows.map(({ hiddenAt, deletedAt, editedBy, likes, dislikes, content, ...row }) => {
    const state = commentState({ hiddenAt, deletedAt });

    return { ...row, state, content: state === 'visible' ? content : '', editedByModerator: editedBy !== null, likes: likes ?? 0, dislikes: dislikes ?? 0 };
  });
}

export function branchOf(imageId: number | null){
  return imageId === null ? isNull(comments.imageId) : eq(comments.imageId, imageId);
}

export async function reactionCounts(commentId: number){
  const row = await db.select({
    likes: sql<number>`coalesce(sum(${commentReactions.value} = 1), 0)`,
    dislikes: sql<number>`coalesce(sum(${commentReactions.value} = -1), 0)`
  }).from(commentReactions).where(eq(commentReactions.commentId, commentId)).get();

  return { likes: row?.likes ?? 0, dislikes: row?.dislikes ?? 0 };
}
