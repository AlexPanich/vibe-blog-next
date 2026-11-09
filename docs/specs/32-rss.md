# 32. RSS-лента

| | |
|---|---|
| Статус | реализовано, план — `32-rss.plan.md` |
| Lifecycle | не меняется (в RSS — только то, что видно в `/posts`: `status = 'published'`) |
| Источник идеи | спека 30, «Не сделано»: RSS в подвале |
| Зависит от | 05 (лента), 30 (подвал), 31 (подвал без заглушек) |

## 1. Цель

Читать Vibe в RSS-читалке. Новых данных не нужно — те же опубликованные посты, что в
ленте.

## 2. Решения

1. **Три ленты, по путям, а не query** (обсуждено):
   - `/rss.xml` — весь блог;
   - `/tags/<slug>/rss.xml` — рубрика (неизвестный slug — 404);
   - `/authors/<id>/rss.xml` — автор (id через `idOrFail`, нет пользователя — 404, как
     `getAuthor`; пользователь без опубликованных постов — пустая лента, не 404).

   Почему пути: файл с расширением не идёт через `proxy.ts` (matcher исключает
   `.*\.[a-zA-Z0-9]+$`), глобального rate limit у RSS нет. Route с `searchParams`
   динамический — каждый запрос в БД. По путям route кэшируется (`revalidate`), отдельный
   limiter не нужен.
2. **Состав** — 30 последних опубликованных постов по `publishedAt desc`.
3. **Элемент** (обсуждено: выдержка, не полный текст) — `title`, `link` (абсолютная
   ссылка на `/posts/<id>`), `guid` (та же ссылка, `isPermaLink="true"`), `pubDate`
   (`publishedAt`, RFC 822 — `toUTCString()`), `dc:creator` — имя автора (email не
   отдаём), `category` — названия рубрик, `description` — `postExcerpt()` из
   `postText.ts` (то же, что в карточке, plain text, экранированный). Обложка —
   `enclosure` варианта 800px (`withCovers` → `imageUrl(key, 800)`), `type="image/webp"`,
   `length` — размер файла через `fs.stat`; файла нет — `enclosure` не выводим.
4. **Канал** — `title` («Vibe», «Vibe — рубрика <name>», «Vibe — <имя автора>»), `link`
   на соответствующую страницу сайта (`/`, `/posts?tag=<slug>`, `/authors/<id>`),
   `description`, `language` `ru`, `lastBuildDate` — `publishedAt` первого поста (нет
   постов — время сборки), `atom:link rel="self"`.
5. **Кэш** (→ план, реш. 1: кэш в памяти вместо `revalidate`) — `export const revalidate = 600` (10 минут) на всех трёх route; route не
   трогает сессию и cookies — ответ одинаков для всех. Динамические сегменты без
   `generateStaticParams`: кэш собирается по первому запросу. `Content-Type:
   application/rss+xml; charset=utf-8`.
6. **Абсолютные URL** — базовый адрес из нового `config/site.ts` (`siteUrl`), читает тот же
   `BETTER_AUTH_URL`, без новой переменной окружения.
7. **Ссылки на ленты**:
   - `<link rel="alternate" type="application/rss+xml">` на `/rss.xml` — в metadata
     публичного layout (`alternates.types`);
   - на `/authors/[id]` — `alternates.types` на ленту автора в `generateMetadata` и
     ссылка «RSS автора» на странице;
   - в ленте `/posts`, когда выбрана ровно одна рубрика, — ссылка «RSS рубрики»
     (страница рубрики — это `/posts?tag=<slug>`, отдельной нет);
   - иконка RSS (`IconRss`) в подвале → `/rss.xml`, заменяет пометку «RSS — после спеки
     32» в `SiteFooter`.
8. **Сборка XML** — функция в `domains/posts/shared/` (`postRss.ts`: загрузка постов по
   условию + рендер строки), экранирование — маленький хелпер `escapeXml` в `core/`.
   Без библиотек.

## 3. Данные

Нет. Миграций нет.

## 4. UI и файлы

- `app/rss.xml/route.ts`, `app/(public)/tags/[slug]/rss.xml/route.ts`,
  `app/(public)/authors/[id]/rss.xml/route.ts` — route handlers layout не используют,
  группа `(public)` только держит пути рядом со страницами.
- `src/config/site.ts`, `src/core/escapeXml.ts`, `src/domains/posts/shared/postRss.ts`.
- Правки: `(public)/layout.tsx` (metadata), `authors/[id]/page.tsx`, лента `/posts`
  (ссылка при одной рубрике), `SiteFooter.tsx`.

## 5. Вне scope

Atom, JSON Feed, полный текст поста, лента комментариев, лента по нескольким рубрикам
или по типу поста.
