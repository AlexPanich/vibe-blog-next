import 'server-only';
import { db } from "@/globals/db";
import { comments, posts, users, type PostStatus } from "@/database/schema";
import type { OfficeCommentResource } from "@/domains/comments/dto/commentResources";
import type { OfficeCommentTab } from "@/domains/comments/dto/commentRequests";
import { and, count, desc, eq, gt, isNull, lt, ne, type SQL } from "drizzle-orm";

export const OFFICE_COMMENTS_PAGE = 20;

/*
  Вкладки `office/comments` (спека 23, lifecycle comment.md «В кабинете»), свежие сверху:
  - «К моим постам» — чужие комментарии под всеми постами автора в любом статусе и под
    картинками их галерей; у скрытого текст и причина не отдаются — только пометка;
  - «Мои» — свои комментарии под опубликованными постами, скрытые — с текстом и причиной.
  Удалённые не показываются нигде. Порядок по id: он же курсор «Показать ещё»
*/
export async function loadOfficeComments(userId: number, tab: OfficeCommentTab, beforeId?: number){
  const rows = await db.select({
    id: comments.id,
    imageId: comments.imageId,
    content: comments.content,
    createdAt: comments.createdAt,
    editedAt: comments.editedAt,
    editedBy: comments.editedBy,
    hiddenAt: comments.hiddenAt,
    hideReason: comments.hideReason,
    postId: posts.id,
    postTitle: posts.title,
    postStatus: posts.status,
    authorName: users.name,
    authorAvatarKey: users.avatarKey
  })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .innerJoin(users, eq(users.id, comments.userId))
    .where(and(tabWhere(userId, tab), beforeId === undefined ? undefined : lt(comments.id, beforeId)))
    .orderBy(desc(comments.id))
    .limit(OFFICE_COMMENTS_PAGE + 1);

  return {
    items: rows.slice(0, OFFICE_COMMENTS_PAGE).map(row => toOfficeComment(row, tab === 'mine')),
    hasMore: rows.length > OFFICE_COMMENTS_PAGE
  };
}

export async function countOfficeComments(userId: number): Promise<Record<OfficeCommentTab, number>> {
  const total = async (tab: OfficeCommentTab) => {
    const [ row ] = await db.select({ total: count() })
      .from(comments)
      .innerJoin(posts, eq(posts.id, comments.postId))
      .where(tabWhere(userId, tab));

    return row.total;
  };
  const [ received, mine ] = await Promise.all([ total('received'), total('mine') ]);

  return { received, mine };
}

/*
  «N новых» в плитке «Комментарии» на «Начале» (спека 43): то же условие, что у вкладки
  «К моим постам», и позже последнего открытия вкладки. since null — новые все
*/
export function countNewComments(userId: number, since: Date | null){
  return db.select({ total: count() })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .where(and(tabWhere(userId, 'received'), since === null ? undefined : gt(comments.createdAt, since)))
    .get()?.total ?? 0;
}

export function tabWhere(userId: number, tab: OfficeCommentTab): SQL | undefined {
  return tab === 'mine'
    ? and(eq(comments.userId, userId), eq(posts.status, 'published'), isNull(comments.deletedAt))
    : and(eq(posts.userId, userId), ne(comments.userId, userId), isNull(comments.deletedAt));
}

/*
  Ссылка — как у уведомлений: пост в ленте — к комментарию на странице поста или картинки,
  иначе — в кабинет поста. Ответить можно только чужому видимому под опубликованным постом:
  «#reply-N» открывает форму ответа под ним (`CommentItem`)
*/
function toOfficeComment(row: OfficeRow, own: boolean): OfficeCommentResource {
  const published = row.postStatus === 'published';
  const branch = row.imageId === null ? '' : `/images/${row.imageId}`;
  const hidden = row.hiddenAt !== null;

  return {
    id: row.id,
    content: hidden && !own ? null : row.content,
    hidden,
    hideReason: hidden && own ? row.hideReason : null,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    editedByModerator: row.editedBy !== null,
    href: published ? `/posts/${row.postId}${branch}#comment-${row.id}` : `/office/posts/${row.postId}`,
    canReply: !own && published && !hidden,
    onImage: row.imageId !== null,
    postTitle: row.postTitle,
    author: { name: row.authorName, avatarKey: row.authorAvatarKey }
  };
}

type OfficeRow = {
  id: number,
  imageId: number | null,
  content: string,
  createdAt: Date,
  editedAt: Date | null,
  editedBy: number | null,
  hiddenAt: Date | null,
  hideReason: string | null,
  postId: number,
  postTitle: string,
  postStatus: PostStatus,
  authorName: string,
  authorAvatarKey: string | null
}
