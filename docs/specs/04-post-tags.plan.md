# 04. Рубрики постов — план

Спека: [04-post-tags.md](04-post-tags.md). Порядок: core → схема → домен `tags` →
посты → фильтр → документы.

## 1. `core/slug.ts`

`slugify(text)` — транслитерация кириллицы (ГОСТ-подобная таблица, `ё → e`, `й → y`,
`щ → shch`, `ъ/ь` выкидываются), нижний регистр, всё кроме `a-z0-9` → `-`, без дефисов
по краям. Не знает о проекте — пригодится для url поста.

## 2. Схема

- `tags`: `id`, `name`, `nameKey` (unique), `slug` (unique), `createdAt`. `nameKey` —
  `name.toLocaleLowerCase('ru')`: `lower()` в SQLite меняет регистр только у ASCII, и
  индекс по `lower(name)` пропустил бы «Горы» и «горы».
- `post_tags`: `postId`, `tagId`, PK из обоих, индекс по `tagId`. `onDelete: cascade` на
  `tagId` объявлен для схемы, но `PRAGMA foreign_keys` в проекте не включён — удаление
  рубрики чистит `post_tags` явно в транзакции.
- Relations: `posts.postTags`, `postTags.post / tag`, `tags.postTags`.
- `npx drizzle-kit generate --name post_tags`, просмотреть, `migrate`.

## 3. Домен `tags`

- `policy.ts` — `manageTags(user)`: `moderator` или `admin`.
- `dto/tagRequests.ts` — `tagDto { name: trim, 2–30 }`.
- `dto/tagResources.ts` — `tagResource { id, name, slug }`, `tagListResource`.
- `shared/tagNameKey.ts` — `tagNameKey(name)`; `shared/sortTags.ts` — сортировка по
  `localeCompare('ru')` (ORDER BY в SQLite сравнивает байты).
- `actions/tagActions.ts`:
  - `createTagAction` — занятый `nameKey` → ошибка поля «Такая рубрика уже есть»;
    пустой `slugify` → «Нужны буквы или цифры»; слаг — первый свободный из `base`,
    `base-2`, …;
  - `renameTagAction` — `nameKey` занят другой рубрикой → ошибка поля; слаг не трогаем;
  - `deleteTagAction` — транзакция: `post_tags` по `tagId`, затем `tags`.
- `components/`: `TagChips` (без `'use client'`, работает и в серверных, и в клиентских:
  `linked` — ссылки на `/posts?tag=`, иначе подписи), `TagPicker` (client, чипы-переключатели,
  лимит 3), `TagCreateForm`, `TagRow` (client: переименование в строке, удаление с
  подтверждением), `TagFilter` (server: ряд ссылок со счётчиками).
- `exports/`: `TagChips`, `TagPicker`, `TagFilter`, `tagResources`.

## 4. Посты

- `postOwnCreateDto` += `tagIds: z.array(z.int().positive()).max(3, 'Не больше трёх рубрик')`,
  дубли убираются. Неизвестные id → ошибка поля `tagIds`.
- `createPostAction` / `updatePostAction` — транзакция: пост, затем `post_tags` заменяются
  целиком. Правка по-прежнему только при `status = 'draft'` в том же запросе.
- Загрузка рубрик: `with: { postTags: { with: { tag: true } } }` → в ресурс
  `tags: tagResource[]` (отсортированные). Хелпер `shared/postTags.ts`:
  `withTagsQuery` и `pickTags(post)`.
- `postResource` += `tags` — значит, `posts/page.tsx` и `posts/simple-list` грузят рубрики.
- Форма: `PostFormFields` += `TagPicker`, страницы create/edit передают список рубрик
  ресурсом; edit — стартовые `tagIds`.
- Показ: `PostCard` (ссылки), публичная страница поста (ссылки), кабинет автора,
  страница модерации, `PostRow` (проп `tags`, подписи) в очереди модерации и «Все посты».

## 5. Фильтр `/posts`

- `posts/dto/postFeedRequests.ts` — `tag` из searchParams: строка или массив → массив
  слагов, неизвестные выкидываются после сверки с БД (решение 9).
- Запрос: `posts.id IN (SELECT post_id FROM post_tags WHERE tag_id IN (…) GROUP BY post_id
  HAVING count(*) = n)`.
- Счётчики: рубрики + `count` опубликованных постов, join через `post_tags`.
- `TagFilter`: «Все», рубрики со счётчиком > 0 и выбранные; ссылка чипа — текущий набор
  с переключённым слагом.
- Пусто при фильтре — «По этим рубрикам постов пока нет» и «Сбросить фильтр».

## 6. Справочник `/office/moderation/tags`

`breakIfCant(manageTags)`, список с числом постов (всех статусов), форма создания,
`TagRow`. Пункт «Рубрики» в группе «Модерация» меню (`moderator`, `admin`).

## 7. Документы

- `post.md` — рубрики как часть содержимого: меняются только в черновике, проходят
  модерацию; удаление рубрики снимает её с опубликованных постов без модерации.
- Спека → `done`, отклонения — в спеку.

## 8. Проверка

- `tsc`, `lint`.
- `some` (moderator): создать «Горы», «Советы», «Озёра»; дубль «горы» — ошибка; «!!!» —
  ошибка; переименовать «Советы» → «Полезное», слаг прежний.
- `bob`: черновик с тремя рубриками; попытка четвёртой — чип неактивен; сохранить,
  отправить на модерацию; рубрики видны в очереди у `some`; одобрить.
- Лента: чипы со счётчиками, фильтр по одной и двум рубрикам («И»), неизвестный слаг
  игнорируется, пустой результат — сообщение и сброс.
- Удаление рубрики: подтверждение с числом постов, рубрика пропала у поста.
- `bob` без роли moderator → `/office/moderation/tags` 403.
- Подчистить тестовые рубрики и вернуть пост.
