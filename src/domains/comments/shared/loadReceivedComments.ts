import 'server-only';
import { db } from "@/globals/db";
import { comments, posts, users, type PostStatus } from "@/database/schema";
import type { ReceivedCommentResource } from "@/domains/comments/dto/commentResources";
import { and, count, desc, eq, isNull, lt, ne, type SQL } from "drizzle-orm";

export const RECEIVED_PAGE = 20;

/*
  «К моим постам» (спека 23): чужие комментарии под всеми постами автора в любом статусе и
  под картинками их галерей, свежие сверху. Удалённые не показываются, у скрытого текст не
  отдаётся — только заглушка. Порядок по id: он же курсор «Показать ещё»
*/
export async function loadReceivedComments(userId: number, beforeId?: number){
  const rows = await db.select({
    id: comments.id,
    imageId: comments.imageId,
    content: comments.content,
    createdAt: comments.createdAt,
    editedAt: comments.editedAt,
    editedBy: comments.editedBy,
    hiddenAt: comments.hiddenAt,
    postId: posts.id,
    postTitle: posts.title,
    postStatus: posts.status,
    authorName: users.name,
    authorAvatarKey: users.avatarKey
  })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .innerJoin(users, eq(users.id, comments.userId))
    .where(and(receivedWhere(userId), beforeId === undefined ? undefined : lt(comments.id, beforeId)))
    .orderBy(desc(comments.id))
    .limit(RECEIVED_PAGE + 1);

  return {
    items: rows.slice(0, RECEIVED_PAGE).map(toReceivedComment),
    hasMore: rows.length > RECEIVED_PAGE
  };
}

export async function countReceivedComments(userId: number){
  const [ { total } ] = await db.select({ total: count() })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .where(receivedWhere(userId));

  return total;
}

function receivedWhere(userId: number): SQL | undefined {
  return and(eq(posts.userId, userId), ne(comments.userId, userId), isNull(comments.deletedAt));
}

/*
  Ссылка — как у уведомлений: пост в ленте — к комментарию на странице поста или картинки,
  иначе — в кабинет поста. Ответить можно только видимому под опубликованным постом
*/
function toReceivedComment(row: ReceivedRow): ReceivedCommentResource {
  const published = row.postStatus === 'published';
  const branch = row.imageId === null ? '' : `/images/${row.imageId}`;

  return {
    id: row.id,
    content: row.hiddenAt ? null : row.content,
    hidden: row.hiddenAt !== null,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    editedByModerator: row.editedBy !== null,
    href: published ? `/posts/${row.postId}${branch}#comment-${row.id}` : `/office/posts/${row.postId}`,
    canReply: published && row.hiddenAt === null,
    onImage: row.imageId !== null,
    postTitle: row.postTitle,
    author: { name: row.authorName, avatarKey: row.authorAvatarKey }
  };
}

type ReceivedRow = {
  id: number,
  imageId: number | null,
  content: string,
  createdAt: Date,
  editedAt: Date | null,
  editedBy: number | null,
  hiddenAt: Date | null,
  postId: number,
  postTitle: string,
  postStatus: PostStatus,
  authorName: string,
  authorAvatarKey: string | null
}
