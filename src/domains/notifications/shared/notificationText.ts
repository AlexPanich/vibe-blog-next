import type { NotificationType, PostReportResolution, PostStatus, Role, UserGender } from "@/database/schema";
import { stripMarkdown } from "@/core/markdown";
import { plural } from "@/core/plural";
import { cutWords } from "@/core/text";

type DescribedRow = {
  userId: number,
  type: NotificationType,
  role: Role | null,
  postId: number | null,
  commentId: number | null,
  dialogId: number | null,
  // Событий в группе (спека 51); у негруппируемых — 1
  groupCount: number,
  actorId: number | null,
  actorGender: UserGender | null,
  postTitle: string | null,
  postStatus: PostStatus | null,
  postAuthorId: number | null,
  commentImageId: number | null,
  commentContent: string | null,
  commentDeletedAt: Date | null,
  commentHiddenAt: Date | null,
  // post.rated: текущая оценка актора, снята — null
  ratingValue: number | null,
  // post_report.resolved: итог жалобы получателя — пара пост–жалобщик уникальна
  postReportResolution: PostReportResolution | null,
  // message.created: непрочитанные входящие в диалоге сейчас
  unreadMessages: number
}

/*
  inline — текст продолжает имя актора («Аня оценила пост»), иначе идёт после двоеточия
  («Аня: «выдержка»»). Компоненты, где имя и текст в одной строке, ставят разделитель по нему
*/
type Described = { text: string, inline: boolean, href: string | null, unavailable: boolean }

// Длина выдержки комментария в уведомлении (спека 51, реш. 10)
const EXCERPT_LENGTH = 80;

const ROLE_LABELS: Record<Role, string> = {
  author: 'автор',
  moderator: 'модератор',
  admin: 'администратор',
};

/*
  Текст и ссылка — по тому, что получатель видит сейчас: пост не опубликован — автору ссылка
  в кабинет, остальным ссылки нет (unavailable). Род актора — только в одиночной строке
  (groupCount = 1): группа — множественное число (спека 51, реш. 12)
*/
export function describeNotification(row: DescribedRow): Described {
  const post = row.postTitle === null ? 'поста' : `«${row.postTitle}»`;
  const single = row.groupCount <= 1;

  switch(row.type){
    case 'post.submitted':
      return fixed(`Пост ${post} ждёт модерации`, `/office/moderation/posts/${row.postId}`);
    case 'report.created':
      return fixed(`Жалоба на комментарий к посту ${post}`, '/office/moderation/reports/comments');
    case 'post_report.created':
      return fixed(`Жалоба на пост ${post}`, '/office/moderation/reports/posts');
    case 'user.unbanned':
      return fixed('Ваш аккаунт разблокирован', '/office/profile');
    case 'user.role_granted':
      // Автору — на «Начало»: там его следующий шаг, первый пост
      return fixed(`Вам выдана роль «${roleLabel(row.role)}»`, row.role === 'author' ? '/office' : '/office/profile');
    case 'user.role_revoked':
      return fixed(`С вас снята роль «${roleLabel(row.role)}»`, '/office/profile');
    case 'user.avatar_removed':
      return fixed('Администратор удалил ваш аватар', '/office/profile');
    case 'user.cover_removed':
      return fixed('Администратор удалил обложку вашего профиля', '/office/profile');
    case 'author_request.created':
      return fixed('Новая заявка на роль автора', '/office/admin/author-requests');
    case 'author_request.rejected':
      return fixed('Заявка на роль автора отклонена', '/office/author-request');
    case 'message.created':
      return { ...messageText(row), href: `/office/messages/${row.dialogId}`, unavailable: false };
    case 'user.followed':
      return {
        ...followText(row),
        // Группа — список подписчиков, а не профиль последнего (план 51, реш. 10)
        href: single ? (row.actorId === null ? null : `/authors/${row.actorId}`) : '/office/follows?tab=followers',
        unavailable: false
      };
  }

  const href = postHref(row);

  if(row.type === 'post.rated'){
    return { ...rateText(row, post), href, unavailable: href === null };
  }

  const quote = excerpt(row);

  if((row.type === 'comment.created' || row.type === 'comment.reply') && !single){
    const what = row.type === 'comment.created' ? `новые комментарии к посту ${post}` : `ответы на ваш комментарий к посту ${post}`;

    return { text: `${others(row.groupCount)}: ${what}`, inline: true, href, unavailable: href === null };
  }

  if((row.type === 'comment.created' || row.type === 'comment.reply') && quote !== null){
    return { text: quote, inline: false, href, unavailable: href === null };
  }

  const text = {
    'comment.created': `Новый комментарий к вашему посту ${post}`,
    'comment.reply': `Ответ на ваш комментарий к посту ${post}`,
    'comment.hidden': `Модератор скрыл ваш комментарий к посту ${post}`,
    'comment.unhidden': `Модератор вернул ваш комментарий к посту ${post}`,
    'comment.edited': `Модератор изменил ваш комментарий к посту ${post}${quote === null ? '' : `: ${quote}`}`,
    'post.approved': `Пост ${post} одобрен и опубликован`,
    'post.rejected': `Пост ${post} отклонён модератором`,
    'post.blocked': `Пост ${post} заблокирован модератором`,
    'post.unblocked': `Пост ${post} разблокирован`,
    'post.published': `Новый пост ${post}`,
    'post.featured': `Ваш пост ${post} выбрали для главной`,
    'report.resolved': `Жалоба на комментарий к посту ${post} рассмотрена`,
    'post_report.resolved': `Жалоба на пост ${post} рассмотрена${resolutionTail(row.postReportResolution)}`,
  }[row.type];

  return { text, inline: false, href, unavailable: href === null };
}

// Тосту группы — свежее событие, как одиночное (спека 51, реш. 14)
export function describeLatest(row: DescribedRow): { text: string, inline: boolean } {
  const { text, inline } = describeNotification({ ...row, groupCount: 1 });

  return { text, inline };
}

function fixed(text: string, href: string): Described {
  return { text, inline: false, href, unavailable: false };
}

function rateText(row: DescribedRow, post: string){
  if(row.groupCount > 1){
    return { text: `${others(row.groupCount)} оценили пост ${post}`, inline: true };
  }

  const value = row.ratingValue;

  if(row.actorGender){
    return { text: `${verb(row.actorGender, [ 'оценил', 'оценила' ])} пост ${post}${value ? ` на ${value}` : ''}`, inline: true };
  }

  return { text: value ? `оценка ${value} посту ${post}` : `новая оценка посту ${post}`, inline: false };
}

function followText(row: DescribedRow){
  if(row.groupCount > 1){
    return { text: `${others(row.groupCount)} подписались на вас`, inline: true };
  }

  if(row.actorGender){
    return { text: `${verb(row.actorGender, [ 'подписался', 'подписалась' ])} на вас`, inline: true };
  }

  return { text: 'новый подписчик', inline: false };
}

// Число — непрочитанные входящие сейчас; всё прочитано — без числа (спека 51, реш. 7)
function messageText(row: DescribedRow){
  const n = row.unreadMessages;

  if(row.actorGender){
    const wrote = verb(row.actorGender, [ 'написал', 'написала' ]);

    return { text: n > 0 ? `${wrote} вам ${n} ${plural(n, [ 'сообщение', 'сообщения', 'сообщений' ])}` : `${wrote} вам`, inline: true };
  }

  return { text: n > 0 ? `${n} ${plural(n, [ 'новое сообщение', 'новых сообщения', 'новых сообщений' ])}` : 'личные сообщения', inline: false };
}

// Выдержка комментария в кавычках; скрытый, удалённый, без commentId или пустой без markdown — нет
function excerpt(row: DescribedRow): string | null {
  if(row.commentId === null || row.commentContent === null || row.commentDeletedAt !== null || row.commentHiddenAt !== null){
    return null;
  }

  const text = cutWords(stripMarkdown(row.commentContent), EXCERPT_LENGTH);

  return text === '' ? null : `«${text}»`;
}

function verb(gender: UserGender, [ m, f ]: [ string, string ]){
  return gender === 'f' ? f : m;
}

// «и ещё N» — кроме актора строки
function others(groupCount: number){
  return `и ещё ${groupCount - 1}`;
}

// withdrawn жалобщику не уведомляется, но строка могла остаться от прошлых данных — без итога
function resolutionTail(resolution: PostReportResolution | null){
  if(resolution === 'blocked'){
    return ': пост заблокирован';
  }
  else if(resolution === 'kept'){
    return ': пост оставлен';
  }

  return '';
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
