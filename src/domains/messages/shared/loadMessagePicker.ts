import 'server-only';
import { db } from "@/globals/db";
import { dialogs, userFollows, users } from "@/database/schema";
import type { MessagePickerRowResource } from "@/domains/messages/dto/messageResources";
import { writeBlockReason } from "@/domains/messages/shared/messageAccess";
import { blockedWithQueries } from "@/domains/users/exports/userBlocks";
import type { AuthUser } from "@/shared/authUser";
import { escapeLike } from "@/shared/escapeLike";
import { banActiveSql } from "@/shared/userBan";
import { and, asc, desc, eq, ne, not, notInArray, or, sql } from "drizzle-orm";

export const MESSAGE_PICKER_LIMIT = 20;

export const MESSAGE_PICKER_MIN_QUERY = 2;

/*
  Выбор собеседника (спека 50, message.md «Начать переписку»). Без запроса (или короче 2
  символов) — мои подписки, свежие сверху. С запросом — поиск по имени среди авторов (роль),
  моих подписок и моих подписчиков: читатель без связи со мной не находится. Staff ищет по всем
  (everyone) — ему по работе нужно написать любому. Я сам, забаненные
  и блокировка в любую сторону не показываются; остальным запретам — причина в строке
*/
export function loadMessagePicker(me: Pick<AuthUser, 'id' | 'roles'>, q: string | undefined): { search: boolean, everyone: boolean, rows: MessagePickerRowResource[] } {
  const needle = q ?? '';
  const search = needle.length >= MESSAGE_PICKER_MIN_QUERY;
  const everyone = me.roles.includes('moderator') || me.roles.includes('admin');
  const [ blocking, blockedBy ] = blockedWithQueries(me.id);

  // В запросе из одной таблицы drizzle пишет колонку без таблицы ("id"), и в подзапросе по dialogs
  // она связалась бы с dialogs.id — поэтому "users"."id" явно
  const peerId = sql`${users}.${sql.identifier('id')}`;

  const following = sql<number>`EXISTS (SELECT 1 FROM ${userFollows} f WHERE f.follower_id = ${me.id} AND f.following_id = ${peerId})`;
  const follower = sql<number>`EXISTS (SELECT 1 FROM ${userFollows} f WHERE f.follower_id = ${peerId} AND f.following_id = ${me.id})`;
  const author = sql<number>`${users.roles} LIKE '%"author"%'`;
  const hasDialog = sql<number>`EXISTS (SELECT 1 FROM ${dialogs} d WHERE (d.user_low_id = ${me.id} AND d.user_high_id = ${peerId}) OR (d.user_low_id = ${peerId} AND d.user_high_id = ${me.id}))`;

  const common = [
    ne(users.id, me.id),
    not(banActiveSql()),
    notInArray(users.id, blocking),
    notInArray(users.id, blockedBy)
  ];

  const columns = { id: users.id, name: users.name, avatarKey: users.avatarKey, author, following, follower, hasDialog };

  const found = search
    ? db.select(columns)
      .from(users)
      .where(and(
        ...common,
        everyone ? undefined : or(author, following, follower),
        sql`lower_ru(${users.name}) LIKE ${`%${escapeLike(needle.toLocaleLowerCase('ru'))}%`} ESCAPE '\\'`
      ))
      .orderBy(asc(sql`sort_ru(${users.name})`), asc(users.id))
      .limit(MESSAGE_PICKER_LIMIT)
      .all()
    : db.select(columns)
      .from(users)
      .innerJoin(userFollows, and(eq(userFollows.followingId, users.id), eq(userFollows.followerId, me.id)))
      .where(and(...common))
      .orderBy(desc(userFollows.createdAt), desc(users.id))
      .limit(MESSAGE_PICKER_LIMIT)
      .all();

  // SQLite отдаёт флаги 0/1; причина — та же, что на странице автора (строк ≤ 20)
  const rows = db.transaction(tx => found.map(row => ({
    id: row.id,
    name: row.name,
    avatarKey: row.avatarKey,
    author: Boolean(row.author),
    following: Boolean(row.following),
    follower: Boolean(row.follower),
    hasDialog: Boolean(row.hasDialog),
    blockReason: writeBlockReason(tx, me, row.id)
  })));

  return { search, everyone, rows };
}
