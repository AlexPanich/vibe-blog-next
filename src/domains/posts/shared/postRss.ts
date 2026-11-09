import 'server-only';
import { db } from "@/globals/db";
import { uploadPath } from "@/globals/uploads";
import { posts } from "@/database/schema";
import { siteConfig } from "@/config/site";
import { escapeXml } from "@/core/escapeXml";
import { imageUrl } from "@/core/imageUrl";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withCovers } from "@/domains/posts/shared/postImages";
import { postExcerpt } from "@/domains/posts/shared/postText";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { stat } from "node:fs/promises";

/*
  Лента RSS (спека 32): link и selfPath — пути от корня, абсолютными их делает рендер.
  key — ключ кэша: 'all', 'tag:<id>', 'author:<id>'
*/
export type RssFeed = {
  key: string,
  title: string,
  link: string,
  description: string,
  selfPath: string,
  where?: SQL
}

/*
  Готовый ответ ленты. XML кэшируется в памяти процесса на 10 минут, а не через revalidate:
  статический route пререндерился бы при сборке на пустой базе и с build-time адресом
  (план 32, реш. 1). Один процесс Node — то же допущение, что у liveBus
*/
export async function rssResponse(feed: RssFeed){
  const now = Date.now();
  let entry = cache.get(feed.key);

  if(!entry || entry.expires <= now){
    entry = { xml: renderRss(feed, await loadRssPosts(feed.where)), expires: now + TTL };
    cache.set(feed.key, entry);
  }

  return new Response(entry.xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': `public, max-age=${TTL / 1000}`
    }
  });
}

const TTL = 10 * 60 * 1000;

const LIMIT = 30;

// Ключей не больше, чем рубрик и пользователей: 404 до кэша не доходит
const store = globalThis as unknown as { rssCache?: Map<string, { xml: string, expires: number }> };
const cache = store.rssCache ??= new Map<string, { xml: string, expires: number }>();

type RssPost = Awaited<ReturnType<typeof loadRssPosts>>[number];

// Видимость — как у ленты /posts: только опубликованные
async function loadRssPosts(where?: SQL){
  const rows = await db.query.posts.findMany({
    where: and(eq(posts.status, 'published'), where),
    orderBy: desc(posts.publishedAt),
    limit: LIMIT,
    with: { author: { columns: { name: true } }, ...POST_TAGS_WITH }
  });
  const withCover = await withCovers(rows);

  return Promise.all(withCover.map(async post => ({
    ...post,
    tags: pickTags(post),
    enclosure: post.cover ? await enclosureOf(post.cover.fileKey) : null
  })));
}

// Вариант 800px обложки; файла нет — enclosure не выводим
async function enclosureOf(key: string){
  try{
    const file = await stat(uploadPath(`${key}-800.webp`));

    return { url: absolute(imageUrl(key, 800)), length: file.size };
  }
  catch{
    return null;
  }
}

function renderRss(feed: RssFeed, items: RssPost[]){
  const lastBuild = items[0]?.publishedAt ?? new Date();

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '<channel>',
    tag('title', feed.title),
    tag('link', absolute(feed.link)),
    tag('description', feed.description),
    tag('language', 'ru'),
    tag('lastBuildDate', lastBuild.toUTCString()),
    `<atom:link href="${escapeXml(absolute(feed.selfPath))}" rel="self" type="application/rss+xml"/>`,
    ...items.map(renderItem),
    '</channel>',
    '</rss>',
    ''
  ].join('\n');
}

function renderItem(post: RssPost){
  const link = absolute(`/posts/${post.id}`);
  const parts = [
    tag('title', post.title),
    tag('link', link),
    `<guid isPermaLink="true">${escapeXml(link)}</guid>`,
    tag('pubDate', (post.publishedAt ?? post.createdAt).toUTCString()),
    tag('dc:creator', post.author.name),
    ...post.tags.map(t => tag('category', t.name)),
    tag('description', postExcerpt(post.content))
  ];

  if(post.enclosure){
    parts.push(`<enclosure url="${escapeXml(post.enclosure.url)}" length="${post.enclosure.length}" type="image/webp"/>`);
  }

  return `<item>\n${parts.join('\n')}\n</item>`;
}

function tag(name: string, value: string){
  return `<${name}>${escapeXml(value)}</${name}>`;
}

function absolute(path: string){
  return `${siteConfig.url}${path}`;
}
