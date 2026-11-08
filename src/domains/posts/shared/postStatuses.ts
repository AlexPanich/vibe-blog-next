import type { PostStatus } from "@/database/schema";

/*
  Переходы между статусами поста — см. docs/lifecycles/post.md.
  by: 'owner' — автор поста (и admin), 'moderator' — moderator и admin.
*/
export const POST_TRANSITIONS = {
  submit:    { from: 'draft',      to: 'moderating', by: 'owner' },
  withdraw:  { from: 'moderating', to: 'draft',      by: 'owner' },
  approve:   { from: 'moderating', to: 'published',  by: 'moderator' },
  reject:    { from: 'moderating', to: 'rejected',   by: 'moderator' },
  redraft:   { from: 'rejected',   to: 'draft',      by: 'owner' },
  unpublish: { from: 'published',  to: 'draft',      by: 'owner' },
  archive:   { from: 'published',  to: 'hidden',     by: 'owner' },
  restore:   { from: 'hidden',     to: 'published',  by: 'owner' },
  /*
    Блокировка из ленты и из архива — два перехода, потому что у перехода один from.
    В UI это одна кнопка, переход выбирает blockPostAction по статусу поста
  */
  block:          { from: 'published', to: 'blocked',   by: 'moderator' },
  blockArchived:  { from: 'hidden',    to: 'blocked',   by: 'moderator' },
  unblock:        { from: 'blocked',   to: 'published', by: 'moderator' },
  redraftBlocked: { from: 'blocked',   to: 'draft',     by: 'owner' },
  // Правка архивного поста (спека 25): после неё — снова модерация, а не сразу в ленту
  redraftArchived: { from: 'hidden',   to: 'draft',     by: 'owner' },
} as const satisfies Record<string, { from: PostStatus, to: PostStatus, by: 'owner' | 'moderator' }>;

export type PostTransition = keyof typeof POST_TRANSITIONS;

/*
  Переходы автора с отдельной кнопкой в кабинете. Возврат в черновик из rejected, blocked и
  hidden своей кнопки не имеет — его делает «Изменить» (POST_EDIT_TRANSITIONS)
*/
export const POST_OWNER_TRANSITIONS = [ 'submit', 'withdraw', 'unpublish', 'archive', 'restore' ] as const;

export type PostOwnerTransition = (typeof POST_OWNER_TRANSITIONS)[number];

/*
  «Изменить» вне черновика (спека 25): правится только черновик, поэтому кнопка сначала
  возвращает пост в него переходом своего статуса
*/
export const POST_EDIT_TRANSITIONS = {
  published: 'unpublish',
  moderating: 'withdraw',
  rejected: 'redraft',
  blocked: 'redraftBlocked',
  hidden: 'redraftArchived',
} as const satisfies Record<Exclude<PostStatus, 'draft'>, PostTransition>;

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Черновик',
  moderating: 'На модерации',
  published: 'Опубликован',
  rejected: 'Отклонён',
  hidden: 'В архиве',
  blocked: 'Заблокирован',
};

// Подписи вкладок по статусу — во множественном числе: «Черновики 2», «Опубликованы 9»
export const POST_STATUS_TAB_LABELS: Record<PostStatus, string> = {
  draft: 'Черновики',
  moderating: 'На проверке',
  published: 'Опубликованы',
  rejected: 'Отклонённые',
  hidden: 'В архиве',
  blocked: 'Заблокированные',
};
