import 'server-only';
import { db } from "@/globals/db";
import { postTags, tagFollows, tags } from "@/database/schema";
import type { TagModerationFilterDto } from "@/domains/tags/dto/tagModerationRequests";
import { sortTags, tagNameKey } from "@/domains/tags/shared/tagNames";
import { getTableColumns, sql } from "drizzle-orm";

/*
  Справочник рубрик для модерации: все рубрики (total — до поиска) и найденные строки.
  Поиск и сортировка — в JS: lower() и ORDER BY в SQLite не понимают кириллицу, а рубрик
  немного
*/
export async function loadModerationTags(filter: TagModerationFilterDto){
  // Подзапросы, а не два join: иначе посты и подписчики перемножились бы
  const all = await db.select({
    ...getTableColumns(tags),
    postsCount: sql<number>`(select count(*) from ${postTags} where ${postTags.tagId} = ${tags.id})`.mapWith(Number),
    followersCount: sql<number>`(select count(*) from ${tagFollows} where ${tagFollows.tagId} = ${tags.id})`.mapWith(Number),
  }).from(tags);

  const q = filter.q ? tagNameKey(filter.q) : undefined;
  const found = q ? all.filter(tag => tagNameKey(tag.name).includes(q) || tag.slug.includes(q)) : all;

  return { total: all.length, rows: sortRows(found, filter.sort) };
}

function sortRows<T extends Row>(rows: T[], sort: TagModerationFilterDto['sort']): T[] {
  const byName = sortTags(rows);

  if(sort === 'name'){
    return byName;
  }

  const key = sort === 'followers' ? 'followersCount' : 'postsCount';

  return byName.sort((a, b) => b[key] - a[key]);
}

type Row = { name: string, postsCount: number, followersCount: number };
