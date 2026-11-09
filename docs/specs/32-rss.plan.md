# 32. RSS-лента — план

Спека — `32-rss.md`. Макета нет: ссылки на ленты — мелкие элементы в существующей вёрстке.

## Решения плана (в спеке не было или уточнено)

1. **Кэш — не `revalidate`, а в памяти процесса** (отступление от спеки п. 5). Причина:
   `/rss.xml` без динамического сегмента с `revalidate = 600` Next пререндерит **при сборке**.
   В Docker сборка идёт на пустой базе (`scripts/migrate.ts` без сида) и без `BETTER_AUTH_URL`
   (он задаётся только в рантайме, `render.yaml` / `docker-compose.yml`). В образ запеклась бы
   пустая лента со ссылками на `http://localhost:3000`, и после каждого старта контейнера
   (ISR-кэш на диске контейнера, не в томе) первый запрос получал бы её — stale-while-revalidate.
   Поэтому: все три route — `export const dynamic = 'force-dynamic'`, готовая XML-строка
   кэшируется в `Map` в `globalThis` на 10 минут по ключу ленты (`all`, `tag:<id>`,
   `author:<id>`). Один процесс Node — то же допущение, что у `liveBus`. Ключей не больше, чем
   рубрик и пользователей: 404 не кэшируется. Цель спеки сохранена — не каждый запрос идёт в БД,
   limiter не нужен. Плюс заголовок `Cache-Control: public, max-age=600` для читалок.
2. **Ссылка на общую ленту в `<head>` — вручную**, не `metadata.alternates`. Относительный
   URL в metadata требует `metadataBase`, а статические страницы (`/about`, `/rules`,
   `/moderation`) собираются при build — туда запёкся бы build-time адрес. В `<head>`
   публичного layout — `<link rel="alternate" type="application/rss+xml" title="Vibe"
   href="/rss.xml" />`, относительный href браузер и читалки разрешают сами. `metadataBase`
   не добавляем.
3. **Лента автора в `generateMetadata`** — `alternates.types` с **абсолютным** URL из
   `siteConfig.url` (страница динамическая, env рантайма). Ручная ссылка layout остаётся,
   на странице автора видны обе ленты — так и надо.
4. **Ссылки на ленты — обычный `<a>`**, не `Link`: `Link` попытался бы мягкую навигацию на
   route handler (RSC-запрос → откат на полную загрузку). eslint запрещает только `next/link`.
5. **404 в route** — `idOrFail` / `notFound()` работают и в route handler: Next отдаёт 404
   (`app-route/module.js` ловит `isHTTPAccessFallbackError`).
6. **Где ссылка «RSS автора»** — в ряду `.ui-author-more` под сеткой постов, внутри
   `UserBlockGate` (у заблокировавшего посты скрыты — ссылка тоже). Ряд выводится всегда (и при
   пустой сетке), кнопка «Все посты в ленте» в нём — как сейчас, по условию.
7. **Где ссылка «RSS рубрики»** — рядом с `TagFollowButton` в `/posts` (то же условие
   `selectedTags.length === 1`), оба в обёртке `.ui-feed-tag-actions` (flex, gap).
8. **`pubDate`** — `publishedAt ?? createdAt` (колонка nullable в схеме, у опубликованных
   заполнена, запасной вариант — на всякий случай).

## Шаги

### 1. `src/config/site.ts`
```ts
import 'server-only';

export const siteConfig = {
  // Абсолютные ссылки вне страниц (RSS); тот же адрес, что у better-auth
  url: (process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
}
```
Env читается здесь же, как `config/auth.ts` (не импортировать `authConfig` — другой смысл).

### 2. `src/core/escapeXml.ts`
`escapeXml(value: string)` — `&` первым, затем `<`, `>`, `"`, `'`; плюс выкинуть символы,
запрещённые в XML 1.0 (`/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g`) — иначе
читалка отбросит всю ленту из-за одного символа в тексте поста. Без импортов из `src/`.

### 3. `src/domains/posts/shared/postRss.ts` (`'server-only'`)
Экспорт:
- `type RssFeed = { key: string, title: string, link: string, description: string, selfPath: string, where?: SQL }`
  (`link` и `selfPath` — пути от корня, абсолютными их делает рендер).
- `async function rssResponse(feed: RssFeed): Promise<Response>` — берёт XML из кэша или
  собирает, отдаёт `new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' } })`.

Ниже (не экспортируются):
- кэш: `const cache = (globalThis.__rssCache ??= new Map<string, { xml: string, expires: number }>())`
  (объявить тип в `declare global`, как в `globals/liveBus.ts` — посмотреть там приём),
  `TTL = 10 * 60 * 1000`.
- `loadRssPosts(where)`: `db.query.posts.findMany({ where: and(eq(posts.status, 'published'), where), orderBy: desc(posts.publishedAt), limit: 30, with: { author: { columns: { name: true } }, ...POST_TAGS_WITH } })`,
  затем `withCovers(rows)` и `pickTags`. Условие видимости — как у ленты `/posts`
  (`loadFeed`: только `status = 'published'`).
- `enclosureOf(cover)`: `fileKey` → файл `${key}-800.webp`, `stat(uploadPath(file))` из
  `@/globals/uploads` (`node:fs/promises`), ошибка → `null`. URL — `siteConfig.url + imageUrl(key, 800)`.
- `renderRss(feed, posts)` — строка:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <channel>
      <title>…</title><link>abs(link)</link><description>…</description>
      <language>ru</language>
      <lastBuildDate>(publishedAt первого поста ?? new Date()).toUTCString()</lastBuildDate>
      <atom:link href="abs(selfPath)" rel="self" type="application/rss+xml"/>
      <item>
        <title/> <link>abs(/posts/<id>)</link> <guid isPermaLink="true">та же</guid>
        <pubDate/> <dc:creator>имя автора</dc:creator>
        <category>…</category>×N
        <description>postExcerpt(content)</description>
        <enclosure url="…" length="…" type="image/webp"/>   — если файл есть
      </item>
    </channel>
  </rss>
  ```
  Все текстовые значения и URL — через `escapeXml`. Выдержка — `postExcerpt` из `postText.ts`.

### 4. Route handlers
Все три: `import 'server-only'` не нужен (route — серверный по определению), `export const dynamic = 'force-dynamic'`, только `GET`, сессию и cookies не трогают.
- `src/app/rss.xml/route.ts` — `rssResponse({ key: 'all', title: 'Vibe', link: '/', selfPath: '/rss.xml', description: <description из metadata публичного layout> })`.
  Папка в корне `app/` вне обоих root layout — route handler'у layout не нужен.
- `src/app/(public)/tags/[slug]/rss.xml/route.ts` — `GET(_req, ctx: RouteContext<'/tags/[slug]/rss.xml'>)`;
  рубрика `db.select().from(tags).where(eq(tags.slug, slug))`, нет — `notFound()`. Условие —
  `inArray(posts.id, db.select({ id: postTags.postId }).from(postTags).where(eq(postTags.tagId, tag.id)))`.
  `title: 'Vibe — рубрика <name>'`, `link: feedUrl({ tag: [ slug ] })`, `description: 'Посты рубрики «<name>» в блоге Vibe'`, `key: 'tag:<id>'`.
- `src/app/(public)/authors/[id]/rss.xml/route.ts` — `getAuthor(idOrFail(id))` (404 сам),
  `where: eq(posts.userId, author.id)`, `title: 'Vibe — <name>'`, `link: '/authors/<id>'`,
  `description: author.bio ?? 'Посты автора <name> в блоге Vibe'`, `key: 'author:<id>'`.
  Нет постов — пустой `<channel>` (лента валидна).

Если `RouteContext<...>` не сгенерирован для новых путей до первого `next dev`/`build` —
запустить `npx next typegen` (или dev) перед `tsc`.

### 5. Ссылка в `<head>` — `src/app/(public)/layout.tsx`
В `<head>` после `ColorSchemeScript`: `<link rel="alternate" type="application/rss+xml" title="Vibe" href="/rss.xml" />` (реш. 2). `office/layout.tsx` не трогаем: кабинет не для читалок.

### 6. Страница автора — `src/app/(public)/authors/[id]/page.tsx`
- `generateMetadata`: добавить `alternates: { types: { 'application/rss+xml': [ { url: \`${siteConfig.url}/authors/${author.id}/rss.xml\`, title: \`Vibe — ${author.name}\` } ] } }`.
- Разметка (реш. 6): внутри `UserBlockGate`, после сетки/пустого состояния — всегда
  `<div className="ui-author-more">` с условной `ButtonLink` «Все посты в ленте» и
  `<a className="ui-rss-link" href={\`/authors/${author.id}/rss.xml\`}><IconRss size={16} stroke={1.8} /> RSS автора</a>`.
  Пустое состояние и сетка остаются как сейчас.

### 7. Лента — `src/app/(public)/posts/page.tsx`
Вместо одиночного `TagFollowButton`:
```tsx
{ selectedTags.length === 1 && <div className="ui-feed-tag-actions">
  <TagFollowButton … />
  <a className="ui-rss-link" href={`/tags/${selectedTags[0].slug}/rss.xml`}><IconRss size={16} stroke={1.8} /> RSS рубрики</a>
</div> }
```
Слаг — в путь через `encodeURIComponent` (слаги латиница из `core/slug.ts`, но дёшево).

### 8. Подвал — `src/components/layout/SiteFooter.tsx`
Последним в `.ui-footer__links`: `<a href="/rss.xml" className="ui-footer__rss"><IconRss size={15} stroke={1.8} /> RSS</a>`
(видна и на десктопе, и на телефоне). Из комментария убрать «RSS — после спеки 32».

### 9. CSS — `src/theme/layout.css`
- `.ui-rss-link` — `inline-flex`, `align-items: center`, `gap: 0.35rem`, `font-size: 0.875rem`,
  `color: var(--ink-soft)`, без подчёркивания; `:hover` — `var(--ink)`.
- `.ui-footer__links a` уже задаёт цвет; добавить `.ui-footer__rss { display: inline-flex; align-items: center; gap: 0.3rem; }`.
- `.ui-feed-tag-actions` — `display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1.25rem;`
  (отступы — как сейчас у `TagFollowButton`, посмотреть его обёртку).
- `.ui-author-more` — проверить, что flex с gap и ссылка не прилипает к кнопке; если нет — добавить.
Цвета — только токены.

### 10. Документы
- `CLAUDE.md`, раздел «Вёрстка страниц» или новый абзац «RSS»: три ленты, `postRss.ts`,
  кэш в памяти на 10 минут (почему не `revalidate` — реш. 1), ссылки — `<a>`, `config/site.ts`.
- `docs/specs/32-rss.md`: статус «план написан», в п. 5 пометка «→ см. план, реш. 1».
- `docs/specs/README.md`: статус 32 — «план».
- Lifecycle не меняется.

## Проверка

1. `npx tsc --noEmit`, `npm run lint`.
2. dev: `curl -i localhost:3000/rss.xml` — 200, `application/rss+xml`, 30 `<item>` (в dev-базе
   постов больше), порядок по дате, у постов с обложкой `enclosure` с ненулевым `length`;
   `curl -i /tags/<slug>/rss.xml`, `/authors/<id>/rss.xml` — свои посты.
   404: `/tags/net-takoi/rss.xml`, `/authors/999999/rss.xml`, `/authors/01/rss.xml`.
   Автор без опубликованных постов (например, читатель из сида) — 200 и пустой channel.
3. Валидность: `xmllint --noout` на каждый ответ; по желанию — W3C Feed Validator недоступен
   с localhost, достаточно xmllint.
4. Кэш: опубликовать пост (модератор) → в `/rss.xml` его нет до 10 минут; перезапуск dev
   сбрасывает кэш. Это ожидаемо.
5. Браузер (скил `app-run`): в `<head>` любой публичной страницы — `link rel=alternate`;
   на `/authors/<id>` — два alternate и ссылка «RSS автора»; `/posts?tag=<slug>` — «RSS
   рубрики» рядом с подпиской, при двух рубриках — нет; подвал — «RSS» на десктопе и телефоне,
   обе темы.
6. `npm run build` — `/rss.xml` в выводе помечен как динамический (ƒ), не статический.
