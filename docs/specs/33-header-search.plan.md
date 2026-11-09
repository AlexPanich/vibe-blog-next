# 33. Поиск в шапке — план

Спека — `33-header-search.md`. Макет — документ Pencil у автора (не в репозитории), открытого
состояния шапки в нём пока нет — шаг 1. Компоненты макета: `k35PV` (Header), `Ag43d`
(Mobile Header). Открыть через MCP `pencil` (`get_app_state` → `batch_get` по id).

## Решения плана (в спеке не было или уточнено)

1. **`HeaderSearch` рисует всю строку шапки**, а не только лупу. Лупа стоит справа в
   `.ui-masthead__aside`, а поле должно встать в центральный трек сетки на место `TopMenu`
   (десктоп) или занять всю строку (телефон). Если компонент живёт только внутри `aside`,
   поле — не элемент сетки строки, и его пришлось бы позиционировать абсолютно с угадыванием
   ширины бренда и `UserBox`. Поэтому `SiteHeader` (серверный) передаёт куски шапки слотами:
   `<HeaderSearch brand={<Brand />} menu={<TopMenu />} aside={…} />`, а `HeaderSearch` рендерит
   `div.ui-shell.ui-masthead__row` с `data-search="open"` в открытом состоянии. Состояние
   локальное (`useState`), контекст и `:has()` не нужны. Атрибут — на строке, а не на
   `.ui-masthead`, как предлагала спека («например»): строка — корень компонента.
2. **Фокус синхронно в клике — через `flushSync`.** Поле рендерится только в открытом
   состоянии (на сервере его нет — гидрация не расходится, без JS лишней формы нет). Чтобы
   iOS открыл клавиатуру, `focus()` должен случиться в том же обработчике жеста:
   `flushSync(() => setOpen(true)); inputRef.current?.focus();` (`flushSync` из `react-dom`).
3. **Отправка — `router.push`, не нативный GET.** Форма остаётся `<form action="/posts"
   method="get" role="search">` с `name="search"` (семантика, Enter), но `onSubmit` делает
   `preventDefault`, `trim()` и `router.push(q ? `/posts?search=${encodeURIComponent(q)}` : '/posts')`
   — мягкая навигация, SSE и тосты не перезапускаются. Затем `setOpen(false)`. `maxLength={100}` —
   как `search` в `postFeedFilterDto` (длиннее dto всё равно отбросит). URL собирается на месте:
   `feedUrl` — внутренность домена `posts`, из `components/` его брать нельзя, а здесь один параметр.
4. **Кнопки «Найти» в шапке нет**: Enter и клавиша «Поиск» на телефоне (`enterKeyHint="search"`).
   В поле — иконка-лупа слева (`.ui-search__icon`), справа — крестик только на ≤720px (спека п. 1).
5. **Закрытие.** Esc в поле и крестик — закрыть и вернуть фокус на лупу (после `flushSync`,
   как в п. 2: лупа на телефоне видна только после закрытия). Клик мимо — `pointerdown` на
   `document` (слушатель вешается, пока открыто), если цель вне формы и не лупа — закрыть **без**
   возврата фокуса: пользователь кликнул во что-то другое, фокус уходит туда (отступление от
   спеки п. 3 — возврат фокуса только для Esc и крестика). Повторный клик по лупе, пока поле
   открыто (десктоп), закрывает его (toggle) и оставляет фокус на лупе. Текст не хранится: поле
   размонтируется вместе с формой.
6. **Хоткей `/`** — `keydown` на `document`, слушатель есть всегда (после гидрации). Срабатывает,
   если `e.key === '/'` **или** `e.code === 'Slash' && !e.shiftKey` (на русской раскладке эта
   клавиша даёт `.`, а `/` набирается иначе), нет `ctrlKey` / `metaKey` / `altKey`, не
   `e.isComposing`, не `e.defaultPrevented`, и `e.target` не внутри
   `input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"]`
   (диалоги Mantine: открытый модал не должен раскрывать поле под собой). Shift модификатором не
   считается — на части раскладок `/` без него не набрать. Дальше `preventDefault` (Firefox
   иначе откроет быстрый поиск) и то же действие, что клик по лупе (п. 7).
7. **Действие «открыть поиск»** (клик по лупе и `/`) — одна функция `openSearch()`:
   - `pathname === '/posts'` (точное совпадение, `usePathname`) и на странице есть
     `document.getElementById(FEED_SEARCH_ID)` → `input.focus({ preventScroll: true })` и
     `input.scrollIntoView({ block: 'center', behavior: 'smooth' })`; поле шапки не открывается;
   - иначе — открыть поле шапки (п. 2). Если на `/posts` поля ленты почему-то нет — тоже.
   - `/office/feed` (там тоже `FeedSearch`) — по спеке обычное поведение: поле шапки ищет по
     всем постам, поле ленты — по подпискам.
8. **id поля ленты** — константа `FEED_SEARCH_ID = 'feed-search'` в `src/shared/feedSearch.ts`
   (без пометок server/client). Не в файле `HeaderSearch`: импорт из `'use client'`-модуля в
   серверный `FeedSearch` дал бы client reference, а не строку.
9. **Без JS** лупа — `Link href="/posts"` (как сейчас), `onClick` после гидрации делает
   `preventDefault`. `aria-expanded={open}` и `aria-controls` на лупе; на сервере `open = false`,
   первый клиентский рендер тот же.
10. **Тосты** (`NotificationToasts`, `MessageToasts`) выносятся из строки в `header` после неё:
    разметки у них нет, а строка теперь — корень `HeaderSearch`.

## Шаги

### 1. Макет в Pencil
Дорисовать открытое состояние шапки рядом с компонентами `k35PV` и `Ag43d` (экземпляры, не
правка самих компонентов): «Шапка — поиск, десктоп» (светлая и тёмная) — бренд слева, поле
`.ui-search`-вида в центре (на месте меню, ширина до 32rem), справа иконки как обычно;
«Шапка — поиск, телефон» (светлая и тёмная) — поле во всю строку, справа крестик. Цвета —
переменные документа (те же токены). Показать человеку скриншот (`get_screenshot`) и дождаться
«ок» до вёрстки.

### 2. `src/shared/feedSearch.ts`
```ts
// id поля поиска ленты: HeaderSearch ставит в него фокус на /posts (спека 33)
export const FEED_SEARCH_ID = 'feed-search';
```

### 3. `src/domains/posts/components/FeedSearch.tsx`
`id={FEED_SEARCH_ID}` на `input`. Компонент рендерится и в `/office/feed` — id уникален на
странице, поле одно.

### 4. `src/components/layout/HeaderSearch.tsx`
`'use client'` + `import 'client-only'`.

```tsx
type HeaderSearchProps = { brand: ReactNode, menu: ReactNode, aside: ReactNode }

// Строка шапки целиком: поле поиска встаёт на место меню (десктоп) или во всю строку (телефон),
// поэтому бренд, меню и правые иконки приходят слотами из серверного SiteHeader.
export default function HeaderSearch({ brand, menu, aside }: HeaderSearchProps) {
  // open, refs: toggleRef (лупа, HTMLAnchorElement), formRef, inputRef; pathname, router
  return (
    <div className="ui-shell ui-masthead__row" data-search={open ? 'open' : undefined}>
      { brand }
      { open ? <form …className="ui-search ui-header-search"…> : menu }
      <div className="ui-masthead__aside">
        <Link ref={toggleRef} href="/posts" className="ui-round-icon" onClick={onToggleClick}
          aria-label="Поиск по постам" title="Поиск по постам (/)" aria-expanded={open} aria-controls="header-search">
          <IconSearch size={18} aria-hidden />
        </Link>
        { aside }
      </div>
    </div>
  );
}
```

Форма (`id="header-search"`, `action="/posts"`, `method="get"`, `role="search"`, `onSubmit`,
`onKeyDown` для Esc):
- `IconSearch` с классом `ui-search__icon`;
- `input` — `ref={inputRef}`, `type="search"`, `name="search"`, `maxLength={100}`,
  `enterKeyHint="search"`, `autoComplete="off"`, `placeholder="Поиск по постам"`,
  `aria-label="Поиск по постам"`, класс `ui-search__input`;
- `button type="button"` `ui-header-search__close` с `IconX`, `aria-label="Закрыть поиск"`.

Логика (порядок в файле — по `codestyle.md`: экспорт сверху, хелперы ниже):
- `onToggleClick(e)`: `e.preventDefault()`; открыто → `close(true)`; иначе `openSearch()`.
- `openSearch()` — п. 7 решений; `close(returnFocus)` — `flushSync(() => setOpen(false))`,
  затем при `returnFocus` — `toggleRef.current?.focus()`.
- `onSubmit` — п. 3; Esc в `onKeyDown` формы — `e.preventDefault()`, `close(true)`.
- `useEffect` по `open`: пока открыто — `pointerdown` на `document` (п. 5), снять в cleanup.
- `useEffect` без зависимостей от `open`: `keydown` на `document` для `/` (п. 6). `openSearch`
  читает `pathname` — держать актуальное значение в `useRef` (или `useEffectEvent`, если версия
  React его даёт без флага; иначе ref), чтобы не переподписываться на каждый рендер.
- Хелпер `isTypingTarget(target: EventTarget | null)` — ниже компонента.

Проверить, что `Link` из `@/components/general/Link` пропускает `ref` (React 19 — `ref` как
проп, `ComponentProps<typeof NextLink>` его включает); если нет — `ref` на обёртку не вешать,
а искать лупу по id.

### 5. `src/components/layout/SiteHeader.tsx`
```tsx
<header className="ui-masthead">
  <HeaderSearch
    brand={<Brand />}
    menu={<TopMenu />}
    aside={<>
      <ColorSchemeToggle />
      <NotificationBell initialUnread={unread} />
      <UserBox />
    </>}
  />
  { /* Без разметки: показывают тосты. Гостю эти события не приходят */ }
  <NotificationToasts />
  <MessageToasts />
</header>
```
Убрать импорт `IconSearch` и `Link`, обновить комментарий к компоненту (поиск теперь в шапке).

### 6. `src/theme/layout.css` — раздел «Шапка»
После `.ui-nav` / перед медиа-запросами:
```css
/* Поиск в шапке (спека 33): поле встаёт на место меню, трек меню растягивается. */
.ui-masthead__row[data-search='open'] {
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.ui-header-search {
  justify-self: center;
  width: 100%;
  max-width: 32rem;
}

.ui-header-search__close {
  display: none;
  /* кнопка без фона, как .ui-search__clear */
  flex: none; align-items: center; justify-content: center;
  width: 36px; height: 36px; border: 0; border-radius: var(--radius-pill);
  background: transparent; color: var(--ink-faint); cursor: pointer;
}

.ui-header-search__close:hover {
  color: var(--ink);
}
```
`.ui-search` уже даёт фон `--paper-tint`, рамку на `:focus-within`, `flex: 1 1 18rem` — в сетке
`flex` не мешает. Убрать у `.ui-search__input` нативный крестик `type="search"` только для
шапки, если он дублирует наш: `.ui-header-search .ui-search__input::-webkit-search-cancel-button { appearance: none; }`.

В `@media (max-width: 720px)`:
```css
.ui-masthead__row[data-search='open'] > .ui-brand,
.ui-masthead__row[data-search='open'] > .ui-masthead__aside {
  display: none;
}

.ui-header-search {
  grid-column: 1 / -1;
  max-width: none;
}

.ui-header-search__close {
  display: inline-flex;
}
```
Высота строки на телефоне фиксирована (`--masthead-h`), поле (~44px) в неё помещается — проверить,
что шапка не прыгает при открытии. Обновить оглавление в шапке `layout.css`, если там
перечислены блоки раздела.

### 7. Проверка
`npx tsc --noEmit`, `npm run lint`. В браузере (скил `app-run`, субагент), светлая и тёмная схема,
1280px и 390px:
- гость и вошедший, публичная часть и `/office/*`: лупа раскрывает поле, фокус в поле, меню
  (десктоп) / бренд и иконки (телефон) скрыты, ширина строки не скачет;
- Enter с текстом → `/posts?search=…`, результаты отфильтрованы, поле закрыто; пустой Enter →
  `/posts`; с `/tags/<slug>?type=…` фильтры не переносятся;
- Esc и крестик → закрыто, фокус на лупе; клик мимо → закрыто; повторный клик по лупе → закрыто;
  после повторного открытия поле пустое;
- `/` открывает поле; не срабатывает в поле комментария, в редакторе поста (contenteditable), в
  диалоге сообщений, с Ctrl/Cmd; на русской раскладке клавиша `/`-`.` тоже открывает;
- на `/posts` лупа и `/` прокручивают к `FeedSearch` и ставят фокус в него, поле шапки не
  открывается; на `/office/feed` и `/tags/<slug>` — открывается поле шапки;
- без JS (отключить в драйвере) лупа ведёт на `/posts`;
- в консоли нет hydration-ошибок.

### 8. Документы
- В спеку 33: статус «done», в конец — отклонения (п. 1 и 5 решений плана и найденное при проверке).
- `docs/specs/README.md`: строка 33 — `done`.
- `CLAUDE.md`, раздел «Layouts» (абзац про каркас): `SiteHeader` строит строку через клиентский
  `HeaderSearch` (бренд, меню, иконки — слотами), поиск в шапке раскрывается на месте меню.
