import type { PostReportReason, PostStatus, PostType } from "../../src/database/schema.ts";
import type { TagName } from "./people.ts";

// [ ключ набора в photos.json, номер фото в наборе, подпись ]
export type SeedPhoto = [ string, number, string? ];

export type SeedPost = {
  url: string,
  author: string,
  title: string,
  // Подзаголовок: 20–200 символов, CHECK в БД (спека 35)
  lead?: string,
  type?: PostType,
  lat?: number,
  lng?: number,
  source?: string,
  status?: PostStatus,
  // Причина для rejected / blocked — уходит в post_moderations
  moderation?: string,
  tags: TagName[],
  // Сколько дней назад создан и опубликован
  days: number,
  photos: SeedPhoto[],
  content: string,
  // Жалобы на пост (спека 36): открытые, если не разобраны (reportsResolved)
  reports?: { by: string, reason: PostReportReason, comment?: string }[],
  // Разобраны модератором some: оставил пост или заблокировал его
  reportsResolved?: 'kept' | 'blocked'
}

export type SeedComment = {
  by: string,
  text: string,
  // Через сколько часов после публикации поста
  hours: number,
  // Номер фото в галерее поста — комментарий к фото
  image?: number,
  // Скрыт модератором с этой причиной
  hidden?: string,
  // Удалён автором: остаётся заглушкой, если есть ответы
  deleted?: boolean,
  likes?: string[],
  dislikes?: string[],
  // Жалобы от этих пользователей: открытые; у скрытого — закрыты скрытием
  reports?: string[],
  // Жалобы разобраны: модератор оставил комментарий
  reportsKept?: boolean,
  replies?: SeedComment[]
}
