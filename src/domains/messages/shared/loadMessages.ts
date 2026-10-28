import 'server-only';
import { db } from "@/globals/db";
import { dialogs, messageIgnores, messages, users } from "@/database/schema";
import type { DialogPageDto, MessagePageDto } from "@/domains/messages/dto/messageRequests";
import type { DialogRowResource, DialogViewResource, MessageItemResource } from "@/domains/messages/dto/messageResources";
import { isIgnored, isRestricted, MESSAGE_PAGE_SIZE, writeBlockReason, type DBTransaction } from "@/domains/messages/shared/messageAccess";
import type { AuthUser } from "@/shared/authUser";
import { messageSnippet } from "@/domains/messages/shared/messageSnippet";
import { and, asc, count, desc, eq, exists, gt, isNull, lt, ne, not, or, sql } from "drizzle-orm";

export const DIALOG_PAGE_SIZE = 20;

/*
  Мои диалоги без скрытых собеседников, свежие сверху. Курсор — (lastMessageAt, id): пока
  листаешь, новые сообщения поднимают диалоги наверх и не сдвигают уже показанные порции
*/
export function loadDialogRows(userId: number, cursor: DialogPageDto = {}): { items: DialogRowResource[], hasMore: boolean } {
  const peerId = sql<number>`CASE WHEN ${dialogs.userLowId} = ${userId} THEN ${dialogs.userHighId} ELSE ${dialogs.userLowId} END`;
  const rows = db.select({
    id: dialogs.id,
    lastMessageAt: dialogs.lastMessageAt,
    peerId: users.id,
    peerName: users.name,
    peerAvatarKey: users.avatarKey,
    lastContent: sql<string | null>`(SELECT m.content FROM messages m WHERE m.dialog_id = ${dialogs.id} ORDER BY m.id DESC LIMIT 1)`,
    lastUserId: sql<number | null>`(SELECT m.user_id FROM messages m WHERE m.dialog_id = ${dialogs.id} ORDER BY m.id DESC LIMIT 1)`,
    unread: sql<number>`(SELECT count(*) FROM messages m WHERE m.dialog_id = ${dialogs.id} AND m.user_id <> ${userId} AND m.read_at IS NULL)`
  })
    .from(dialogs)
    .innerJoin(users, eq(users.id, peerId))
    .where(and(
      or(eq(dialogs.userLowId, userId), eq(dialogs.userHighId, userId)),
      not(exists(db.select().from(messageIgnores).where(and(eq(messageIgnores.userId, userId), eq(messageIgnores.ignoredId, users.id))))),
      cursor.beforeAt !== undefined && cursor.beforeId !== undefined
        ? sql`(${dialogs.lastMessageAt}, ${dialogs.id}) < (${cursor.beforeAt}, ${cursor.beforeId})`
        : undefined
    ))
    .orderBy(desc(dialogs.lastMessageAt), desc(dialogs.id))
    .limit(DIALOG_PAGE_SIZE + 1)
    .all();

  return {
    items: rows.slice(0, DIALOG_PAGE_SIZE).map(row => ({
      id: row.id,
      peer: { id: row.peerId, name: row.peerName, avatarKey: row.peerAvatarKey },
      lastMessage: row.lastContent === null ? null : { content: messageSnippet(row.lastContent), mine: row.lastUserId === userId },
      lastMessageAt: row.lastMessageAt,
      unread: row.unread
    })),
    hasMore: rows.length > DIALOG_PAGE_SIZE
  };
}

/*
  Порция истории по курсору id, в хронологическом порядке. Без курсора — последние 50
*/
export function loadMessages(tx: DBTransaction, dialogId: number, page: MessagePageDto = {}): { items: MessageItemResource[], hasMore: boolean } {
  const columns = { id: messages.id, userId: messages.userId, content: messages.content, createdAt: messages.createdAt };

  if(page.afterId !== undefined){
    const items = tx.select(columns).from(messages).where(and(eq(messages.dialogId, dialogId), gt(messages.id, page.afterId))).orderBy(asc(messages.id)).all();

    return { items, hasMore: false };
  }

  const rows = tx.select(columns)
    .from(messages)
    .where(and(eq(messages.dialogId, dialogId), page.beforeId === undefined ? undefined : lt(messages.id, page.beforeId)))
    .orderBy(desc(messages.id))
    .limit(MESSAGE_PAGE_SIZE + 1)
    .all();

  return { items: rows.slice(0, MESSAGE_PAGE_SIZE).reverse(), hasMore: rows.length > MESSAGE_PAGE_SIZE };
}

// Непрочитанные входящие во всех диалогах, кроме скрытых, — счётчик пункта меню
export function countUnreadMessages(userId: number){
  return db.select({ n: count() })
    .from(messages)
    .innerJoin(dialogs, eq(dialogs.id, messages.dialogId))
    .where(and(
      or(eq(dialogs.userLowId, userId), eq(dialogs.userHighId, userId)),
      ne(messages.userId, userId),
      isNull(messages.readAt),
      not(exists(db.select().from(messageIgnores).where(and(eq(messageIgnores.userId, userId), eq(messageIgnores.ignoredId, messages.userId)))))
    ))
    .get()?.n ?? 0;
}


/*
  Всё для страницы диалога; dialogId = null — новый диалог (страница new). Собеседника нет — undefined
*/
export function loadDialogView(tx: DBTransaction, me: Pick<AuthUser, 'id' | 'roles'>, peerId: number, dialogId: number | null): DialogViewResource | undefined {
  const peer = tx.select({ id: users.id, name: users.name, avatarKey: users.avatarKey }).from(users).where(eq(users.id, peerId)).get();

  if(!peer){
    return undefined;
  }

  const history = dialogId === null ? { items: [], hasMore: false } : loadMessages(tx, dialogId);

  return {
    id: dialogId,
    meId: me.id,
    peer,
    messages: history.items,
    hasMore: history.hasMore,
    blockReason: writeBlockReason(tx, me, peerId),
    restricted: isRestricted(tx, me.id, peerId),
    ignored: isIgnored(tx, me.id, peerId)
  };
}
