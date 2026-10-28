import 'server-only';
import { liveBus } from "@/globals/liveBus";
import { postTopic } from "@/shared/liveEvents";

/*
  Живая страница поста (спека 29), после commit. Комментарии — только сигнал: блок
  перечитывает ветку тем же loadComments, скрытые тексты и блокировки в событие не попадают
*/
export function publishCommentsChanged(comment: { postId: number, imageId: number | null }){
  liveBus.publishTopic(postTopic(comment.postId), 'post.comments.changed', { postId: comment.postId, imageId: comment.imageId });
}

export function publishCommentReactions(postId: number, commentId: number, counts: { likes: number, dislikes: number }){
  liveBus.publishTopic(postTopic(postId), 'comment.reactions', { postId, commentId, likes: counts.likes, dislikes: counts.dislikes });
}
