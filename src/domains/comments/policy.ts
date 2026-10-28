import { AuthUser } from "@/shared/authUser";
import type { CommentState } from "@/domains/comments/shared/commentState";

// Сколько о комментарии нужно правилам: и строке БД (через commentState), и ресурсу клиента
type CommentFacts = { userId: number, state: CommentState }

// Чья это ветка: автор поста и авторы предков без заглушек «удалён» — своего текста там больше нет
type CommentBranch = { postAuthorId: number, ancestorAuthorIds: number[] }

export function moderateComments(user: AuthUser){
  return user.roles.includes('moderator') || user.roles.includes('admin');
}

/*
  Правка и удаление: свой и не скрытый — скрытый ждёт решения модератора
*/
export function manageComment(user: AuthUser, comment: CommentFacts){
  return comment.userId === user.id && comment.state === 'visible';
}

/*
  Правка: свой видимый — автору, чужой видимый — модератору (спека 24). Скрытый не правит
  никто: сначала «Вернуть»
*/
export function editComment(user: AuthUser, comment: CommentFacts){
  return comment.state === 'visible' && (comment.userId === user.id || moderateComments(user));
}

/*
  Реакция и ответ — только на видимый; на свой реагировать нельзя, отвечать можно
*/
export function reactComment(user: AuthUser, comment: CommentFacts){
  return comment.userId !== user.id && comment.state === 'visible';
}

export function replyComment(comment: CommentFacts){
  return comment.state === 'visible';
}

/*
  Модератор скрывает и возвращает только чужое: своё он может удалить, а решение о своём
  скрытом комментарии отменить не должен
*/
export function hideComment(user: AuthUser, comment: CommentFacts){
  return moderateComments(user) && comment.userId !== user.id && comment.state === 'visible';
}

export function unhideComment(user: AuthUser, comment: CommentFacts){
  return moderateComments(user) && comment.userId !== user.id && comment.state === 'hidden';
}

/*
  Жалуется тот, под чьим текстом комментарий: автор поста или автор любого предка по ветке
  (ответ на ответ в моей ветке — тоже ответ мне). Модератору кнопка не нужна — у него очередь
*/
export function reportComment(user: AuthUser, comment: CommentFacts, branch: CommentBranch){
  const ownBranch = branch.postAuthorId === user.id || branch.ancestorAuthorIds.includes(user.id);

  return comment.userId !== user.id && comment.state === 'visible' && ownBranch;
}
