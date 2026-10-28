'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { rateLimiters } from "@/globals/rateLimiter";
import { commentModerations, commentReactions, commentReports, comments, postImages, posts } from "@/database/schema";
import { aiIdSchema, commentCreateDto, commentDto, commentReactDto, receivedCommentsPageDto } from "@/domains/comments/dto/commentRequests";
import { receivedCommentListResource, type CommentViewer } from "@/domains/comments/dto/commentResources";
import { moderateComments, reactComment, replyComment } from "@/domains/comments/policy";
import { commentState } from "@/domains/comments/shared/commentState";
import { ensurePostPublished, findCommentOrStale, removeComment } from "@/domains/comments/shared/commentGuards";
import { branchOf, reactionCounts } from "@/domains/comments/shared/loadComments";
import { notifyCommentCreated } from "@/domains/comments/shared/commentNotifications";
import { loadReceivedComments } from "@/domains/comments/shared/loadReceivedComments";
import { resource } from "@/core/resource";
import { blockedAmong, blockingAmong, isBlockedBetween } from "@/domains/users/exports/userBlocks";
import { notify, publishNotifications } from "@/domains/notifications/exports/notify";
import { consumeOrFail } from "@/shared/rateLimitAction";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/*
  Ветка — пост (imageId = null) или картинка его галереи
*/
export const createCommentAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema, aiIdSchema.nullable() ])
  .inputSchema(commentCreateDto)
  .action(async ({ parsedInput: { content, parentId }, bindArgsParsedInputs: [ postId, imageId ], ctx: { auth } }) => {
    await consumeOrFail(rateLimiters.commentCreate, String(auth.id));

    const created = db.transaction(tx => {
      ensurePostPublished(tx, postId);

      if(imageId !== null && !tx.select({ id: postImages.id }).from(postImages).where(and(eq(postImages.id, imageId), eq(postImages.postId, postId))).get()){
        actionError(409, 'Картинка уже удалена');
      }

      let parentAuthorId: number | null = null;

      if(parentId !== undefined){
        const parent = tx.select().from(comments).where(eq(comments.id, parentId)).get();

        if(!parent || parent.postId !== postId || parent.imageId !== imageId || !replyComment({ userId: parent.userId, state: commentState(parent) })){
          actionError(409, 'Комментарий, на который вы отвечаете, уже недоступен');
        }

        parentAuthorId = parent.userId;
      }

      // Блокировка с автором поста или родителя — ни комментария к его посту, ни ответа ему (спека 26)
      const postAuthorId = tx.select({ userId: posts.userId }).from(posts).where(eq(posts.id, postId)).get()!.userId;

      if([ postAuthorId, parentAuthorId ].some(id => id !== null && id !== auth.id && isBlockedBetween(tx, auth.id, id))){
        actionError(403, 'Нельзя: между вами блокировка');
      }

      const { id } = tx.insert(comments)
        .values({ postId, imageId, userId: auth.id, parentId: parentId ?? null, content })
        .returning({ id: comments.id })
        .get();

      return { id, notificationIds: notifyCommentCreated(tx, postId, id, parentAuthorId, auth.id) };
    });

    publishNotifications(created.notificationIds);
    revalidatePost();

    return { id: created.id };
  });

/*
  Свой — правка автора, сбрасывает «изменён модератором». Чужой — правка модератора (спека 24):
  прежний текст уходит в журнал, автору — уведомление. Скрытый не правит никто: его могли
  скрыть, пока была открыта форма, — 409
*/
export const updateCommentAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(commentDto)
  .action(async ({ parsedInput: { content }, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const notificationIds = db.transaction(tx => {
      const comment = findCommentOrStale(tx, id);
      const own = comment.userId === auth.id;

      if(!own && !moderateComments(auth)){
        actionError(403, 'Править можно только свой комментарий');
      }

      ensurePostPublished(tx, comment.postId);

      if(comment.content === content){
        return [];
      }

      const updated = tx.update(comments)
        .set({ content, editedAt: new Date(), editedBy: own ? null : auth.id })
        .where(and(eq(comments.id, id), isNull(comments.hiddenAt), isNull(comments.deletedAt)))
        .returning({ id: comments.id })
        .all();

      if(updated.length === 0){
        actionError(409, 'Комментарий скрыт модератором — править нельзя');
      }

      if(own){
        return [];
      }

      tx.insert(commentModerations).values({ commentId: id, userId: auth.id, decision: 'edited', comment: comment.content }).run();

      return notify(tx, 'comment.edited', [ comment.userId ], { actorId: auth.id, postId: comment.postId, commentId: id });
    });

    publishNotifications(notificationIds);
    revalidatePost();

    return { done: true };
  });

export const deleteCommentAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    db.transaction(tx => {
      const comment = findCommentOrStale(tx, id);

      if(comment.userId !== auth.id){
        actionError(403, 'Удалить можно только свой комментарий');
      }

      if(comment.hiddenAt){
        actionError(409, 'Комментарий скрыт модератором — удалить нельзя');
      }

      ensurePostPublished(tx, comment.postId);
      removeComment(tx, id);
    });

    revalidatePost();

    return { done: true };
  });

export const reactCommentAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(commentReactDto)
  .action(async ({ parsedInput: { value }, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    db.transaction(tx => {
      const comment = findCommentOrStale(tx, id);

      if(comment.userId === auth.id){
        actionError(403, 'На свой комментарий реагировать нельзя');
      }

      if(!reactComment(auth, { userId: comment.userId, state: commentState(comment) })){
        actionError(409, 'Комментарий скрыт модератором');
      }

      if(isBlockedBetween(tx, auth.id, comment.userId)){
        actionError(403, 'Нельзя: между вами блокировка');
      }

      ensurePostPublished(tx, comment.postId);

      const own = and(eq(commentReactions.commentId, id), eq(commentReactions.userId, auth.id));

      if(value === 0){
        tx.delete(commentReactions).where(own).run();
      }
      else{
        tx.insert(commentReactions)
          .values({ commentId: id, userId: auth.id, value })
          .onConflictDoUpdate({ target: [ commentReactions.commentId, commentReactions.userId ], set: { value } })
          .run();
      }
    });

    revalidatePost();

    return { ...(await reactionCounts(id)), mine: value };
  });

/*
  «Своё» для страницы поста: публичная часть сессию на сервере не читает, клиент спрашивает сам
*/
export const loadCommentViewerAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema, aiIdSchema.nullable() ])
  .action(async ({ bindArgsParsedInputs: [ postId, imageId ], ctx: { auth } }): Promise<CommentViewer> => {
    const reactions = await db.select({ commentId: commentReactions.commentId, value: commentReactions.value })
      .from(commentReactions)
      .innerJoin(comments, eq(comments.id, commentReactions.commentId))
      .where(and(eq(comments.postId, postId), branchOf(imageId), eq(commentReactions.userId, auth.id)));

    const hidden = await db.select({ id: comments.id, content: comments.content, reason: comments.hideReason })
      .from(comments)
      .where(and(
        eq(comments.postId, postId),
        branchOf(imageId),
        isNotNull(comments.hiddenAt),
        isNull(comments.deletedAt),
        moderateComments(auth) ? undefined : eq(comments.userId, auth.id)
      ));

    const reports = await db.select({ commentId: commentReports.commentId, resolvedAt: commentReports.resolvedAt })
      .from(commentReports)
      .innerJoin(comments, eq(comments.id, commentReports.commentId))
      .where(and(eq(comments.postId, postId), branchOf(imageId), eq(commentReports.userId, auth.id)));

    // Авторы ветки и автор поста — среди них и ищем блокировки
    const postAuthor = await db.select({ userId: posts.userId }).from(posts).where(eq(posts.id, postId)).get();
    const authors = await db.selectDistinct({ userId: comments.userId }).from(comments).where(and(eq(comments.postId, postId), branchOf(imageId)));
    const people = [ ...new Set([ ...authors.map(a => a.userId), ...(postAuthor ? [ postAuthor.userId ] : []) ]) ].filter(id => id !== auth.id);

    return {
      blocking: blockingAmong(db, auth.id, people),
      blockedWith: blockedAmong(db, auth.id, people),
      myReactions: Object.fromEntries(reactions.map(r => [ r.commentId, r.value as 1 | -1 ])),
      hidden: Object.fromEntries(hidden.map(h => [ h.id, { content: h.content, reason: h.reason ?? '' } ])),
      reports: Object.fromEntries(reports.map(r => [ r.commentId, r.resolvedAt ? 'resolved' : 'sent' ]))
    };
  });

/*
  «Показать ещё» во вкладке «К моим постам»: чужого тут нет — выборка по auth.id
*/
export const loadReceivedCommentsAction = actionAuthClient
  .inputSchema(receivedCommentsPageDto)
  .action(async ({ parsedInput: { beforeId }, ctx: { auth } }) => {
    const { items, hasMore } = await loadReceivedComments(auth.id, beforeId);

    return { items: resource(receivedCommentListResource, items), hasMore };
  });

function revalidatePost(){
  revalidatePath('/posts/[id]', 'page');
  revalidatePath('/posts/[id]/images/[imageId]', 'page');
  // Удаление закрывает жалобы
  revalidatePath('/office/moderation/comments');
}
