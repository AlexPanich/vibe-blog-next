# 13. Типы постов — план

Спека: [13-post-types.md](13-post-types.md). Порядок: схема → dto и запись → форма →
показ → лента → карта → документы → проверка.

## 1. Схема и миграция

- `database/schema.ts`: `POST_TYPES = ['simple', 'translate', 'travel']`, `PostType`;
  в `posts` — `type` (enum, `notNull`, default `'simple'`), `source text`, `lat real`,
  `lng real`; индекс `posts_type_idx`; CHECK `posts_type_fields_check` — те же три ветки,
  что в hw2, в нижнем регистре.
- `npx drizzle-kit generate --name post_types`. SQLite не умеет `ADD CONSTRAINT`, поэтому
  drizzle-kit пересоберёт таблицу (`__new_posts` + копирование). Просмотреть SQL: в
  копировании должны быть все колонки, включая `reviewer_id` и `review_started_at`;
  старые строки получают `type = 'simple'` из default. Бэкап `storage/dev.db` в
  scratchpad → `migrate` → `touch next.config.ts` (HMR держит старую схему).

## 2. Метки и dto

- `posts/shared/postTypes.ts`: `POST_TYPE_LABELS` (Обычный / Перевод / Путешествие),
  `POST_TYPE_TABS` (Все · Обычные · Переводы · Путешествия), `osmUrl(lat, lng)`.
- `posts/dto/postRequests.ts`:
  - `postDetailsDto = z.discriminatedUnion('type', …)`:
    - `simple` — без полей;
    - `translate` — `source`: `z.url({ protocol: /^https?$/ })`, max 500, сообщение
      «Нужна ссылка http(s)://»;
    - `travel` — `lat` −90…90, `lng` −180…180, `z.number()` с округлением до 6 знаков
      в `transform`.
  - `postOwnCreateDto` += `details: postDetailsDto` — обязательное: форма всегда шлёт
    тип, и create, и update.
- `posts/shared/postDetails.ts`: `postDetailsColumns(details)` — в колонки, чужие поля
  явно `null` (как в hw2); `pickDetails(post)` — колонки → `postDetailsResource` для
  клиента.
- `posts/dto/postResources.ts`: `postDetailsResource { type, source, lat, lng }`
  (nullable); `postResource` += его поля (карточка ленты); `postOfficeResource` += те же
  поля (форма правки).

## 3. Запись

`postActions.ts`: `createPostAction` и `updatePostAction` раскладывают
`{ tagIds, details, ...fields }` и пишут `{ ...fields, ...postDetailsColumns(details) }`.
Смена типа в черновике проходит тем же `UPDATE … WHERE status = 'draft'` — отдельной
проверки нет (решение 4). CHECK в БД — последняя линия: до него не доходит, если dto и
`postDetailsColumns` согласованы.

## 4. Форма

- `posts/hooks/usePostForm.ts` (client): состояние плоское — `url, title, content,
  tagIds, type, source, lat, lng` (`lat/lng: number | string` — пустое поле
  `NumberInput`), `payload()` собирает `details` по типу. Перенос из hw2.
- `PostFormFields`: принимает форму `usePostForm`; `SegmentedControl` «Тип поста» над
  URL; под заголовком — `TextInput` «Ссылка на оригинал» или блок «Место»:
  два `NumberInput` + `PostLocationPicker` (п. 7). Ошибки details вложенные —
  `detailsError(errors, 'source' | 'lat' | 'lng')`, как в hw2.
- `PostCreateForm` / `PostEditForm` → `usePostForm`, `action.execute(form.payload())`.
  `office/posts/[id]/edit/page.tsx` передаёт в ресурс тип и поля.
- Переключение типа поля не стирает в состоянии формы: вернулся на «Путешествие» —
  координаты на месте. В запрос уходят только поля выбранного типа.

## 5. Показ

- `PostTypeMeta` (без `'use client'`, как `TagChips`): `simple` — ничего; `translate` —
  метка + ссылка «Оригинал» (`_blank`, `noopener noreferrer nofollow`); `travel` —
  метка + координаты ссылкой на OSM. Проп `compact` — только метка (строки кабинета,
  где вся строка уже ссылка: вложенный `<a>` в `<a>` невалиден).
- Где: `PostCard`, публичная `posts/[id]`, кабинет `office/posts/[id]`, модерация
  `office/moderation/posts/[id]` — полный вид; `PostRow` (свои посты, очередь, «Все
  посты») — `compact`.
- Публичная страница поста у `travel` — `PostLocationMap` под мета-строкой.
- `PostOgImage` += проп `type`: у не-`simple` над заголовком — метка цветом бренда.

## 6. Лента

- `postFeedFilterDto` += `type: z.enum(POST_TYPES).optional().catch(undefined)`.
- `loadFeed` → `feedWhere`: `eq(posts.type, filter.type)`.
- `feedUrl`: `type` после `search`, порядок параметров фиксирован.
- `FeedTypeTabs` (server, `nav.ui-filter` со ссылками — как вкладки модерации): ссылка
  вкладки — `feedUrl({ ...filter, type, limit: undefined })`, остальные фильтры
  сохраняются. Над `FeedSearch`.
- `FeedList` ключуется `feedUrl(filter без limit)` — смена вкладки пересоздаёт список
  сама.

## 7. Карта

- `npm i leaflet react-leaflet` и `-D @types/leaflet`.
- `posts/components/map/`:
  - `PostMapView.tsx` (client, сам Leaflet): `MapContainer`, `TileLayer` CARTO по
    `useComputedColorScheme` (`dark_all` / `light_all`, `attribution` OSM + CARTO),
    `CircleMarker` цвета бренда; режим `picker` — клик ставит точку, метку можно тащить
    (`Marker` с `divIcon` вместо `CircleMarker` — тот не перетаскивается), наружу
    `onChange(lat, lng)`; при внешнем изменении координат — `map.setView`.
    `scrollWheelZoom` выключен, включается по клику на карту.
  - `PostLocationPicker.tsx` и `PostLocationMap.tsx` (client) — обёртки
    `dynamic(() => import('./PostMapView'), { ssr: false, loading: заглушка })`;
    заглушка `.ui-map` той же высоты, чтобы страница не прыгала.
  - Без точки (пустые поля в форме) — карта по центру Европы, зум 3, без метки.
- `leaflet/dist/leaflet.css` — импорт в `PostMapView`. `.ui-map` в `layout.css`:
  высота 300 px, скругление и рамка из токенов, фон-заглушка.
- Ссылка «Открыть в OpenStreetMap» под картой на странице поста.

## 8. Документы

- `docs/lifecycles/post.md` — тип и его поля как часть содержимого: выбираются при
  создании, меняются только в черновике, проходят модерацию; модератор не правит.
- `CLAUDE.md` — Leaflet только через `dynamic(..., { ssr: false })`, тайлы CARTO без
  ключа.
- Спека → `done`, отклонения — в спеку, `README.md` — статус.

## 9. Проверка

- `tsc`, `lint`, `build`.
- `bob`: черновик «Путешествие» без координат — ошибки полей; клик по карте заполняет
  поля, ввод чисел двигает метку; сохранить. Сменить тип на «Перевод» в черновике —
  `source` с `javascript:alert(1)` — ошибка, с `https://…` — сохраняется, в БД
  `lat/lng = null`. Вернуть «Путешествие», отправить на модерацию.
- `some`: в очереди метка типа, на странице модерации координаты и ссылка; одобрить.
- Гость: `/posts?type=travel` — только путешествия, вкладка активна; вкладка
  складывается с рубрикой и поиском; `?type=xxx` — «Все»; карточка с меткой; страница
  поста — карта (тёмная и светлая тема), «Открыть в OpenStreetMap»; без ошибок
  гидрации в консоли.
- Старые посты — `simple`, без метки; OG-картинка путешествия с меткой.
- Прямой `UPDATE` с `type = 'simple'` и `source` через MCP — CHECK отклоняет.
- Подчистить тестовые посты.
