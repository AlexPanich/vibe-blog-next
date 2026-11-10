# 37. Маршрут путешествия — план

Спека — `37-travel-route.md` (решения 1–11). Одна миграция (`0033`: новая таблица + `ADD COLUMN`
руками), lifecycle `post.md` — раздел «Тип», строка в `CLAUDE.md` (раздел про карту). Образцы:
миграция с CHECK на колонке — `0009_post_types.sql`; запись связанных строк в транзакции
сохранения — `replacePostTags` в `postActions.ts`; карта — `components/map/PostMapView.tsx`;
склонение — `core/plural.ts`.

## Решения плана (в спеке не было или уточнено)

1. **Поля координат в форме убираем.** Точки ставятся только кликом по карте и
   перетаскиванием; в строке списка координаты видны мелким текстом (`42.3897, 46.9583`).
   Ручной ввод 20 пар чисел — лишний UI, а ↑/↓, подпись и удаление работают с клавиатуры.
2. **Ключи строк списка.** В состоянии формы у точки есть клиентский `key: number` (начальные
   — индексы, новые — счётчик в `useRef`), в запрос не уходит. Иначе при ↑/↓ фокус и
   незакоммиченный ввод подписи «прыгали» бы на соседнюю строку.
3. **Одна карта на все режимы** — `PostMapView` переделывается под `points: RoutePoint[]`:
   - показ, одна точка — `CircleMarker`, как сейчас (решение 1 спеки: «как сейчас»);
   - показ, 2+ точки — `Polyline` + пронумерованные `Marker` с `divIcon` (номер — в `html`,
     число, не пользовательский текст), `bounds` по всем точкам с `padding`;
   - редактор — тот же `Polyline` и номера, метки `draggable`; клик добавляет точку в конец
     (при 20 — ничего не делает). Подгонка границ — один раз при монтировании (есть точки —
     `fitBounds`, нет — Европа как сейчас); после клика/перетаскивания карта не прыгает.
     `FollowPoint` удаляется (больше нет полей ввода, за которыми надо ехать).
4. **Длина** — чистая функция в `core/geo.ts` (`haversineKm`, `routeKm`): не знает о проекте.
   `routeKm(points)` → `null` при < 2 точках. Форматирование — `domains/posts/shared/postRoute.ts`
   (без `server-only`: нужно и серверным, и клиентским компонентам).
5. **Где что показываем:**
   - страница поста — блок карты (`PostRouteMap`): одна точка — «Место на карте» и координаты
     ссылкой на OSM, как сейчас, плюс « · M дней», если заданы; 2+ точки — «Маршрут поездки»,
     справа «≈ N км по прямой · M дней», под картой — нумерованный список подписей;
   - превью модератора (`PostReviewPreview`) — тот же блок после галереи (решение 10 спеки);
   - страница поста в кабинете — только мета-строка (`PostTypeMeta`), карты нет: так в спеке;
   - карточка ленты (`PostCard`) — в плашке типа на обложке: «Путешествие · ≈ 412 км · 3 дня»
     (что есть из двух), длинная строка — многоточием. `PostFeatured` (главная) не трогаем.
   В макете Pencil в шапке блока «412 км · 3 дня · 5 точек» — делаем по спеке (с «≈», «по
   прямой», без числа точек), макет поправить в шаге 1.
6. **Удаление поста.** В проекте посты не удаляются (нет `delete(posts)`), поэтому из
   раздела 3 спеки («при удалении поста точки удаляются явно») делать нечего — только
   комментарий у таблицы в схеме.
7. **Дни при одной точке без длины** в мета-строке: координаты ссылкой и отдельный
   `ui-meta__item` «M дней» (решение 6 спеки).
8. **Ошибки формы.** Пустой список — ошибка на `details.points` («Поставьте хотя бы одну
   точку на карте»), выводится под картой через `<FieldError />`-подобный текст. Ошибка
   подписи — на `details.points.<i>.label`, у поля строки. Дни — `details.travelDays`.

## Шаги

### 1. Макет редактора в Pencil (до кода)
Документ, открытый в Pencil (`get_app_state`), фрейм редактора поста (найти по имени,
«Редактор» / «Новый пост»; светлый и тёмный, десктоп и моб.). Блок «Маршрут» вместо «Место»:
подпись поля, карта (высота как `.ui-map`), подсказка «Кликните по карте, чтобы добавить
точку · метку можно перетащить», список строк: кружок с номером (как метка на карте), поле
подписи (placeholder «Подпись, например Гуниб»), координаты мелким `--ink-faint`, справа три
иконки-кнопки ↑ ↓ ✕ (36px, спека 49). Под списком — «Дней в пути» (NumberInput, ширина ~140px)
и при 20 точках — подсказка «Это максимум — 20 точек». В шапке «Route Map» страницы поста
заменить текст на «≈ 412 км по прямой · 3 дня». Если сделать макет нельзя — реализовать по
описанию выше.

### 2. Схема и миграция
`src/database/schema.ts`:
- в `posts` после `lng`:
  ```ts
  // Дней в пути (спека 37): вводит автор, только у travel; null — не указано
  travelDays: integer('travel_days'),
  ```
  в третий аргумент — `check('posts_travel_days_check', sql\`${t.travelDays} IS NULL OR (${t.type} = 'travel' AND ${t.travelDays} BETWEEN 1 AND 365)\`)`.
  Комментарий у `lat`/`lng`: «у travel — первая точка маршрута (post_route_points, position 0),
  на них держится posts_type_fields_check».
- новая таблица:
  ```ts
  /*
    Точки маршрута путешествия (спека 37): 1–20, порядок — position с 0. Точка 0 продублирована
    в posts.lat/lng. Сохранение поста пишет точки целиком (delete + insert) в своей транзакции;
    посты не удаляются, а при уходе с travel точки стирает то же сохранение
  */
  export const postRoutePoints = sqliteTable('post_route_points', {
    postId: integer('post_id').notNull().references(() => posts.id),
    position: integer('position').notNull(),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    label: text('label'),
  }, t => [
    primaryKey({ columns: [ t.postId, t.position ] }),
    check('post_route_points_check', sql`
      ${t.position} BETWEEN 0 AND 19 AND
      ${t.lat} BETWEEN -90 AND 90 AND ${t.lng} BETWEEN -180 AND 180 AND
      (${t.label} IS NULL OR length(${t.label}) BETWEEN 1 AND 60)
    `),
  ]);
  ```
  relations: `posts` → `routePoints: many(postRoutePoints)`, обратная — `one(posts)` (по образцу
  `postTags`), если relations объявлены в схеме.
- `src/database/types.ts` — `PostRoutePoint` по образцу соседних.

`npx drizzle-kit generate --name travel_route` → снапшот. SQL **заменить** руками (`posts`
пересобирать нельзя), комментарий-шапка как в `0009`:
```sql
CREATE TABLE `post_route_points` ( …как сгенерировал drizzle-kit… );--> statement-breakpoint
ALTER TABLE `posts` ADD `travel_days` integer CONSTRAINT "posts_travel_days_check" CHECK("travel_days" IS NULL OR ("type" = 'travel' AND "travel_days" BETWEEN 1 AND 365));--> statement-breakpoint
INSERT INTO `post_route_points` (`post_id`, `position`, `lat`, `lng`, `label`)
  SELECT `id`, 0, `lat`, `lng`, NULL FROM `posts` WHERE `type` = 'travel';
```
Прогон на копии `storage/dev.db` через `npm run db:migrate` (migrator показывает ошибку), потом
на dev; проверить `SELECT count(*)` точек = числу travel-постов (MCP `sql-dev`). Dev-сервер не
видит таблицу — `touch next.config.ts`.

### 3. Гео и форматирование
`src/core/geo.ts`:
```ts
export type GeoPoint = { lat: number, lng: number }

// Расстояние по дуге большого круга, км (радиус Земли 6371)
export function haversineKm(a: GeoPoint, b: GeoPoint): number

// Сумма отрезков между соседними точками; меньше двух точек — null
export function routeKm(points: GeoPoint[]): number | null
```
`src/domains/posts/shared/postRoute.ts` (без маркеров server/client):
```ts
// «≈ 412 км», меньше 1 км — «< 1 км»
export function formatRouteKm(km: number): string

// «1 день / 3 дня / 5 дней» — plural из core
export function formatTravelDays(days: number): string

// Части строки «≈ N км · M дней» без пустых: для мета-строки и карточки; withNote — «по прямой» после км
export function routeSummary(routeKm: number | null, travelDays: number | null, withNote = false): string[]
```
Округление — `Math.round`, при `km < 1` — «< 1 км» (решение 2 спеки).

### 4. DTO
`postRequests.ts`:
```ts
export const POST_ROUTE_MAX = 20;
export const ROUTE_LABEL_MAX = 60;
export const TRAVEL_DAYS_MAX = 365;

const routeLabel = z.string().default('')
  .transform(v => v.trim() || null)
  .pipe(z.string().max(ROUTE_LABEL_MAX, `Не больше ${ROUTE_LABEL_MAX} символов`).nullable());

const routePoint = z.object({ lat: coordinate(-90, 90), lng: coordinate(-180, 180), label: routeLabel });
```
вариант `travel`:
```ts
z.object({
  type: z.literal('travel'),
  points: z.array(routePoint)
    .min(1, 'Поставьте хотя бы одну точку на карте')
    .max(POST_ROUTE_MAX, `Не больше ${POST_ROUTE_MAX} точек`),
  travelDays: z.int({ error: 'Целое число дней' }).min(1, 'От 1 до 365').max(TRAVEL_DAYS_MAX, 'От 1 до 365').nullable().default(null)
})
```
`postResources.ts`:
- `routePointResource = z.object({ lat, lng, label: z.string().nullable() })`, `routePointsResource = z.array(…)` + типы;
- `postDetailsResource` — добавить `travelDays: z.number().nullable()` (строки постов полные —
  поле приходит само во все места, где спредится строка);
- `postResource` (карточка) — `routeKm: z.number().nullable()`;
- `postOfficeResource` — `points: routePointsResource`.

### 5. Загрузка и запись точек — `domains/posts/shared/postRoutePoints.ts` (`server-only`)
```ts
// Точки поста по порядку; cache — общая для страницы и превью
export const getRoutePoints = cache(async (postId: number) => …select lat, lng, label… orderBy position)

// Длина маршрута по id постов одним запросом (карточки ленты); у кого < 2 точек — нет в Map
export async function routeKmByPost(postIds: number[]): Promise<Map<number, number>>

// Точки целиком: delete + insert в транзакции сохранения; [] — стереть (уход с travel)
export function replaceRoutePoints(tx: DBTransaction, postId: number, points: RoutePointDto[]): void
```
`DBTransaction` — вынести тип из `postActions.ts` сюда (экспорт) или объявить так же.

`postDetails.ts` — `postDetailsColumns`: `lat`/`lng` = `details.points[0]`, `travelDays` =
`details.type === 'travel' ? details.travelDays : null`.

`postCards.ts` — `withCardData`: `CardSource` + `type`; `routeKmByPost` по id постов с
`type === 'travel'` (пусто — без запроса), в строку — `routeKm: kms.get(post.id) ?? null`.
Запустить в `Promise.all` с `commentCounts`.

### 6. Actions — `postActions.ts`
В обеих транзакциях после записи `posts`: `replaceRoutePoints(tx, id, details.type === 'travel' ? details.points : [])`.
Смена типа и правка только в черновике уже обеспечены (`WHERE status = 'draft'`), решение 9
спеки выполняется этим же вызовом.

### 7. Форма
`usePostForm.ts`:
- в `PostFormState` вместо `lat`/`lng` — `points: RouteFormPoint[]` (`{ key, lat, lng, label: string }`)
  и `travelDays: number | string`;
- initial: `points` из `initial.points` (`label ?? ''`, `key` = индекс), `travelDays ?? ''`;
- `details()` для travel: `points` без `key`, `travelDays: travelDays === '' ? null : Number(travelDays)`.
`PostFormInitial` — `Partial<PostDetailsResource> & { points?: RoutePointResource[] }`.
`PostEditorForm.tsx` — тип `PostFields` + `points`, `EMPTY` — `points: []`.
Страница `office/posts/[id]/edit/page.tsx` — `getRoutePoints(post.id)` в `Promise.all`, в ресурс.

`components/map/PostRouteEditor.tsx` (`'use client'`, `client-only`) — замена
`PostLocationPicker` (удалить его):
- props: `points`, `onChange(points)`, `travelDays`, `onTravelDays`, `errors`
  (`points`, `labels: (string | undefined)[]`, `travelDays`);
- карта — `dynamic(PostMapView, { ssr: false, loading: заглушка .ui-map })` с
  `onAdd(lat, lng)` / `onMove(index, lat, lng)` (координаты — `round` до 6 знаков, как сейчас);
- новый ключ — `useRef` счётчик, начиная с `points.length`;
- под картой — подсказка (или «Это максимум — 20 точек» при лимите), ошибка `points`,
  список `ol.ui-route-list` > `li.ui-route-row`: номер, `TextInput` подписи (`maxLength=60`,
  `aria-label="Подпись точки N"`), координаты, `ActionIcon` ↑ (disabled у первой), ↓ (у
  последней), удалить (disabled при одной точке), у каждой `aria-label`;
- «Дней в пути» — `NumberInput` (`min 1`, `max 365`, `allowDecimal={false}`, placeholder
  «Необязательно»).

`PostFormFields.tsx` — блок `travel`: `Input.Wrapper label="Маршрут"` с `PostRouteEditor`;
`detailsError` переписать: `details.points._errors`, `details.points[i].label._errors`,
`details.travelDays._errors` (структура `validationErrors` вложенная — проверить в браузере).

### 8. Карта — `components/map/PostMapView.tsx`
По решению 3 плана. Props:
```ts
export type PostMapViewProps = {
  points: GeoPoint[],
  // Редактор: клик добавляет точку, метки перетаскиваются; без них карта только показывает
  onAdd?: (lat: number, lng: number) => void,
  onMove?: (index: number, lat: number, lng: number) => void
}
```
- `Polyline positions={…} className="ui-map__route"` при 2+ точках (и в показе, и в редакторе);
- номерная метка — `divIcon({ className: 'ui-map__num', html: String(i + 1), iconSize: [26, 26], iconAnchor: [13, 13] })`,
  иконки — `useMemo` по числу точек; в редакторе `draggable`, курсор `grab`;
- `FitOnMount` — один `useEffect` с пустыми deps по `useMap()`: 1 точка — `setView(point, POINT_ZOOM)`,
  2+ — `fitBounds(latLngBounds(points), { padding: [24, 24], maxZoom: POINT_ZOOM })`;
- `PickOnClick` вызывает `onAdd`, лимит проверяет вызывающий; `wrap()` как сейчас;
- `WheelOnFocus` остаётся.

### 9. Показ
`components/map/PostRouteMap.tsx` (`'use client'`, бывший `PostLocationMap` — переименовать):
props `points: RoutePointResource[]`, `travelDays: number | null`. По решению 5 плана; иконка
шапки — `IconRoute` при 2+ точках, `IconMap2` при одной. Список: `ol.ui-route-points` под
картой, пункт — `label ?? \`Точка ${i + 1}\``. Длина — `routeKm(points)` прямо в компоненте.

Подключить:
- `app/(public)/posts/[id]/page.tsx` — `getRoutePoints(post.id)` в `Promise.all` (только для travel,
  иначе `[]`), `{ post.type === 'travel' && points.length > 0 && <PostRouteMap points={…} travelDays={post.travelDays} /> }`;
  в клиентский компонент — через `resource(routePointsResource, points)` (скил `resource`);
- `PostReviewPreview` — prop `points`, блок после галереи; страница модерации грузит
  `getRoutePoints` для travel.

`PostTypeMeta.tsx` — prop `post: PostDetailsResource & { routeKm: number | null }`:
одна точка (`routeKm === null`) — координаты ссылкой, как сейчас; 2+ — `routeSummary(...)`
(«≈ N км · M дней») одним `ui-meta__item` без ссылки; дни при одной точке — отдельный item.
Вызовы: `office/posts/[id]/page.tsx` и `PostReviewPreview` — `routeKm: routeKm(points)` из
загруженных точек (кабинет — `getRoutePoints` для travel).

`PostCard.tsx` — плашка типа: `[ POST_TYPE_LABELS[type], ...routeSummary(post.routeKm, post.travelDays) ].join(' · ')`.

### 10. CSS — `src/theme/layout.css`, рядом с `.ui-map-*`
- `.ui-map__route` — `stroke: var(--accent); stroke-width: 3; stroke-opacity: 0.85; fill: none`;
- `.ui-map__num` — круг 26px, `background: var(--accent)`, `color: var(--accent-ink)` (или
  контрастный токен, как у `.ui-map__pin`), рамка, тень, `font: 700 0.75rem/26px`, центр, `cursor: grab` в редакторе;
- `.ui-map-block__meta` — правая часть шапки, `color: var(--ink-soft)`, `tabular-nums`;
- `.ui-route-points` — нумерованный список подписей (`--ink-soft`, 0.875rem, колонками на десктопе
  при > 6 пунктах — `columns: 2`);
- `.ui-route-list` / `.ui-route-row` — сетка `auto 1fr auto auto`: номер, подпись, координаты
  (`--ink-faint`, 0.8rem, на телефоне скрыты), кнопки; номер — как `.ui-map__num`;
- `.ui-post-card__type` — `max-width: calc(100% - 1.5rem)`, `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`.
Цвета — только токены `tokens.css`.

### 11. Демо — `scripts/seed-demo/`
- `types.ts`: `route?: { lat: number, lng: number, label?: string }[]`, `travelDays?: number`.
- `fill.ts`: `points = post.route ?? (post.type === 'travel' ? [ { lat: post.lat!, lng: post.lng! } ] : [])`;
  `lat`/`lng` в `posts` = `points[0]`, `travelDays: post.travelDays ?? null`; после вставки
  поста — `postRoutePoints` по `points` с `position`, `label ?? null`.
- Маршруты (координаты и подписи сверить с текстом поста, порядок — как в тексте):
  - `nedelya-v-gorakh-dagestana` — 7 дней: Махачкала (42.9849, 47.5047) → Сулакский каньон
    (43.0190, 46.8240) → Гуниб (42.3897, 46.9583) → Чох (42.3540, 46.9330) → Гамсутль (42.3290, 46.9540);
  - `altay-chuyskiy-trakt` — 5 дней: Бийск (52.5414, 85.2196) → Горно-Алтайск (51.9581, 85.9603) →
    перевал Чике-Таман (50.6450, 86.3150) → Акташ (50.3172, 87.6031) → Курай (50.2283, 87.9372);
  - `ladozhskie-shkhery` — 4 дня: 3–5 точек по тексту поста (Сортавала / Лахденпохья / острова);
  - `splav-po-chusovoy` — 3 дня: Слобода (57.6667, 59.4167) → … → Чусовой (58.2972, 57.8194),
    промежуточные — по тексту;
  - `kazan-za-vykhodnye` — одна точка, `travelDays: 2` (дни без длины).
- `npm run db:seed-dev`, проверить: 4 поста с маршрутами, у остальных travel — одна точка.
  `scripts/` не импортируют `core/geo.ts` — `Dockerfile` не меняется.

### 12. Документы
- `docs/lifecycles/post.md`, «Тип»: у `travel` — маршрут из 1–20 точек (координаты, подпись до
  60 символов) и необязательные дни в пути 1–365; точки — в `post_route_points`, первая
  продублирована в `posts.lat/lng`; маршрут и дни — часть содержимого, при смене типа стираются;
  длина по прямой считается при показе. Упомянуть CHECK `posts_travel_days_check`.
- `CLAUDE.md`, абзац «Карта»: маршрут — `post_route_points` (точки целиком, delete + insert в
  транзакции сохранения), `posts.lat/lng` = точка 0 ради `posts_type_fields_check`; длина —
  `core/geo.ts`, не хранится; номерные метки — `divIcon` с числом.
- Спека: статус → «план готов»; `README.md` — статус 37 → «план».

## Проверка (фаза 4, скил `app-run`)
1. Новый travel-пост: клик по карте ставит 1-ю точку, ещё 3 клика — линия и номера 1–4;
   перетаскивание меняет координаты в строке; ↑/↓ меняют порядок, номера на карте следуют;
   удаление недоступно при одной точке; при 20 точках клик не добавляет, видна подсказка.
2. Сохранение без точек — ошибка под картой; подпись 61 символ — ошибка у строки (`maxLength`
   не даст, проверить серверную через пробелы по краям — обрезаются); дни 0 / 366 — ошибка.
3. Сохранить → перезагрузить редактор: точки, подписи, порядок и дни на месте.
4. Сменить тип на «Обычный», сохранить — в БД нет точек и `travel_days` (MCP `sql-dev`).
5. Страница поста: Дагестан — «Маршрут поездки · ≈ N км по прямой · 7 дней», линия, список
   подписей, границы охватывают все точки; одноточечный пост — «Место на карте» как раньше;
   Казань — координаты и «2 дня». Тёмная тема — линия и номера видны.
6. Лента: карточки с маршрутом — «Путешествие · ≈ N км · M дней», на телефоне без переполнения.
7. Кабинет (страница поста) и превью модератора: мета-строка; в превью — карта маршрута.
8. `npx tsc --noEmit`, `npm run lint`, `npm run build`.
