import type { NotificationType, PostStatus, Role } from "@/database/schema";

type DescribedRow = {
  userId: number,
  type: NotificationType,
  role: Role | null,
  postId: number | null,
  commentId: number | null,
  dialogId: number | null,
  postTitle: string | null,
  postStatus: PostStatus | null,
  postAuthorId: number | null,
  commentImageId: number | null
}

const ROLE_LABELS: Record<Role, string> = {
  author: 'автор',
  moderator: 'модератор',
  admin: 'администратор',
};

/*
  Текст без рода и ссылка — по тому, что получатель видит сейчас: пост не опубликован —
  автору ссылка в кабинет, остальным ссылки нет (unavailable)
*/
export function describeNotification(row: DescribedRow): { text: string, href: string | null, unavailable: boolean } {
  const post = row.postTitle === null ? 'поста' : `«${row.postTitle}»`;

  switch(row.type){
    case 'post.submitted':
      return fixed(`Пост ${post} ждёт модерации`, `/office/moderation/posts/${row.postId}`);
    case 'report.created':
      return fixed(`Жалоба на комментарий к посту ${post}`, '/office/moderation/comments');
    case 'user.unbanned':
      return fixed('Ваш аккаунт разблокирован', '/office/profile');
    case 'user.role_granted':
      // Автору — на «Начало»: там его следующий шаг, первый пост
      return fixed(`Вам выдана роль «${roleLabel(row.role)}»`, row.role === 'author' ? '/office' : '/office/profile');
    case 'user.role_revoked':
      return fixed(`С вас снята роль «${roleLabel(row.role)}»`, '/office/profile');
    case 'user.avatar_removed':
      return fixed('Администратор удалил ваш аватар', '/office/profile');
    case 'author_request.created':
      return fixed('Новая заявка на роль автора', '/office/admin/author-requests');
    case 'author_request.rejected':
      return fixed('Заявка на роль автора отклонена', '/office/author-request');
    case 'message.created':
      return fixed('Новые личные сообщения', `/office/messages/${row.dialogId}`);
  }

  const href = postHref(row);
  const text = {
    'comment.created': `Новый комментарий к вашему посту ${post}`,
    'comment.reply': `Ответ на ваш комментарий к посту ${post}`,
    'comment.hidden': `Модератор скрыл ваш комментарий к посту ${post}`,
    'comment.unhidden': `Модератор вернул ваш комментарий к посту ${post}`,
    'comment.edited': `Модератор изменил ваш комментарий к посту ${post}`,
    'post.approved': `Пост ${post} одобрен и опубликован`,
    'post.rejected': `Пост ${post} отклонён модератором`,
    'post.blocked': `Пост ${post} заблокирован модератором`,
    'post.unblocked': `Пост ${post} разблокирован`,
    'post.published': `Новый пост ${post}`,
    'report.resolved': `Жалоба на комментарий к посту ${post} рассмотрена`,
  }[row.type];

  return { text, href, unavailable: href === null };
}

function fixed(text: string, href: string){
  return { text, href, unavailable: false };
}

function roleLabel(role: Role | null){
  return role ? ROLE_LABELS[role] : '—';
}

function postHref(row: DescribedRow): string | null {
  if(row.postId === null || row.postStatus === null){
    return null;
  }

  if(row.postStatus === 'published'){
    const branch = row.commentImageId === null ? '' : `/images/${row.commentImageId}`;
    const anchor = row.commentId === null ? '' : `#comment-${row.commentId}`;

    return `/posts/${row.postId}${branch}${anchor}`;
  }

  return row.postAuthorId === row.userId ? `/office/posts/${row.postId}` : null;
}
