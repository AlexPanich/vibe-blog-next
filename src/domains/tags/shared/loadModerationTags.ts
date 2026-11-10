import 'server-only';
import { db } from "@/globals/db";
import { postTags, tagFollows, tags } from "@/database/schema";
import type { TagModerationFilterDto } from "@/domains/tags/dto/tagModerationRequests";
import { sortTags, tagNameKey } from "@/domains/tags/shared/tagNames";
import { findSimilarTags } from "@/domains/tags/shared/tagSimilarity";
import { getTableColumns, sql } from "drizzle-orm";

/*
  Справочник рубрик для модерации: все рубрики (all — цели слияния, total — до поиска) и
  найденные строки с подсказкой «похожа на» (спека 47: считается по всем рубрикам). Поиск и
  сортировка — в JS: lower() и ORDER BY в SQLite не понимают кириллицу, а рубрик немного
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
  const similar = findSimilarTags(all);
  const rows = found.map(tag => {
    const target = similar.get(tag.id);

    return { ...tag, similarTo: target ? { id: target.id, name: target.name } : null };
  });

  return { all, total: all.length, rows: sortRows(rows, filter.sort) };
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
