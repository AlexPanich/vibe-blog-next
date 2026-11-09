# 50. Кнопка «Новое сообщение»: выбор собеседника — план

Спека — `50-new-message-picker.md` (решения 1–13 приняты). Миграций нет, нового action нет.
Lifecycle `message.md`, раздел «Начать переписку», уже дописан в рабочем дереве (не закоммичен):
сверить с решениями плана ниже и дописать п. 3 и 5 плана.

## Решения плана (в спеке не было или уточнено)

1. **«Автор» = роль `author`** (`users.roles LIKE '%"author"%'`), как подпись «Автор» в шапке
   диалога (`loadDialogView`). Каталог `/authors` берёт людей с опубликованными постами, а
   `user.md` говорит, что страница `/authors/[id]` есть у каждого, — формулировка спеки «у
   читателя публичной страницы нет» неточная, но правило поиска от этого не меняется: круг —
   роль `author`, мои подписки, мои подписчики.
2. **Подпись строки** — первая подходящая: «Подписка» (я читаю) → «Автор» → «Подписчик» (читает
   меня). Иначе читатель-подписчик остался бы без подписи. Поэтому в ресурсе строки, кроме полей
   спеки, ещё `following` и `author`.
3. **Есть переписка + писать нельзя** (п. 6 и 7 спеки пересекаются): строка — ссылка (в диалоге
   можно читать историю, причину покажет сам диалог), причина — второй строкой, пометка «есть
   переписка» остаётся. Без переписки и с причиной — серая строка без ссылки.
4. **Запрос короче 2 символов** (после `trim`) — режим подсказок, как без запроса. `q` длиннее 100
   символов обрезается dto, не 404.
5. **`to` и `q` вместе** — `to` главнее: `q` игнорируется. `to` — массив или пустая строка — 404
   (`idOrFail('')`), выбор показывается только при `to === undefined`.
6. **Иконка** — `IconMessagePlus` (у «Нового поста» уже `IconPencilPlus`).
7. **FAB — в `messages/layout.tsx`** сразу после `OfficeHead` (тогда работает правило
   `.ui-office-head:has(~ .ui-fab) .ui-office-head__actions { display: none }` — кнопка шапки на
   телефоне прячется). На экране диалога и выбора FAB прятать CSS-правилом
   `body:has(.ui-dialog) .ui-fab`.
8. **Корень выбора — `section.ui-dialog.ui-picker`** (п. 4 спеки): на телефоне работают готовые
   правила `:has(.ui-dialog)` — прячется колонка списка, шапка кабинета и нижняя панель, экран
   во всю высоту. Шапка — `.ui-dialog__head` с `.ui-dialog__back` («‹», только телефон) и
   заголовком «Новое сообщение».
9. **Поле не перемонтируется при смене адреса**: `MessagePicker` без `key` по `q`, локальное
   значение поля — `useState(q)`, адрес обновляет `router.replace` в `startTransition`;
   `isPending` — `Loader` в правой части поля.

## Шаги

### 1. dto — `domains/messages/dto/messageRequests.ts`
```ts
// Выбор собеседника (спека 50): запрос из адреса; длинный обрезается, массив — как без запроса
export const messagePickerDto = z.object({
  q: z.string().transform(s => s.trim().slice(0, 100)).optional().catch(undefined)
});

export type MessagePickerDto = z.infer<typeof messagePickerDto>
```

### 2. Ресурс — `domains/messages/dto/messageResources.ts`
```ts
/*
  Строка выбора собеседника (спека 50): blockReason — почему писать нельзя (серая строка),
  hasDialog — переписка уже есть, в том числе скрытая
*/
export const messagePickerRowResource = messagePeerResource.extend({
  author: z.boolean(),
  following: z.boolean(),
  hasDialog: z.boolean(),
  blockReason: z.string().nullable()
})

export type MessagePickerRowResource = z.infer<typeof messagePickerRowResource>
```

### 3. Загрузка — `domains/messages/shared/loadMessagePicker.ts` (`server-only`)
```ts
export const MESSAGE_PICKER_LIMIT = 20;
export const MESSAGE_PICKER_MIN_QUERY = 2;

export function loadMessagePicker(me: Pick<AuthUser, 'id' | 'roles'>, q: string | undefined): { search: boolean, rows: MessagePickerRowResource[] }
```
- `search = (q ?? '').length >= MESSAGE_PICKER_MIN_QUERY`.
- Выражения (sql-фрагменты drizzle):
  - `following` — `EXISTS (SELECT 1 FROM user_follows WHERE follower_id = me AND following_id = users.id)`;
  - `follower` — то же наоборот (только для условия поиска, в ресурс не идёт);
  - `author` — `users.roles LIKE '%"author"%'`;
  - `hasDialog` — `EXISTS` в `dialogs` по паре: `(user_low_id = me AND user_high_id = users.id) OR (user_low_id = users.id AND user_high_id = me)`.
- Общие условия (п. 5 спеки): `ne(users.id, me.id)`, `isNull(users.bannedAt)`,
  `notInArray(users.id, q1)` и `notInArray(users.id, q2)` из `blockedWithQueries(me.id)`
  (`domains/users/exports/userBlocks`).
- Подсказки: `innerJoin(userFollows, and(eq(userFollows.followingId, users.id), eq(userFollows.followerId, me.id)))`,
  `orderBy(desc(userFollows.createdAt), desc(users.id))`, `limit(20)`. `following` тут всегда `true`.
- Поиск: `or(author, following, follower)` + `sql\`lower_ru(${users.name}) LIKE ${`%${escapeLike(q.toLocaleLowerCase('ru'))}%`} ESCAPE '\\'\``
  (как в `authorsDirectory`), `orderBy(asc(sql\`sort_ru(${users.name})\`), asc(users.id))`, `limit(20)`.
- `blockReason` — одной транзакцией чтения: `db.transaction(tx => rows.map(row => ({ ...row, blockReason: writeBlockReason(tx, me, row.id) })))`.
  Строк ≤ 20, запросов на строку ≤ 5 — приемлемо (спека, §3).
- `Boolean(...)` для флагов: SQLite отдаёт 0/1.

### 4. Страница — `app/office/messages/new/page.tsx`
```ts
const { to, q } = await searchParams;

if(to === undefined){
  const { search, rows } = loadMessagePicker(user, messagePickerDto.parse({ q }).q);

  return <MessagePicker q={...} search={search} rows={resource(z.array(messagePickerRowResource), rows)} />;
}

const peerId = idOrFail(typeof to === 'string' ? to : '');
// дальше — как сейчас
```
- В `MessagePicker` передать `q` — строку после dto (или `''`).
- Комментарий страницы дописать: без `to` — выбор собеседника (спека 50).

### 5. Компонент — `domains/messages/components/MessagePicker.tsx` (`'use client'`, `client-only`)
Пропсы: `q: string`, `search: boolean`, `rows: StrictResource<T, MessagePickerRowResource[]>`.

- Шапка: `<div className="ui-dialog__head">` → `Link .ui-dialog__back` на `/office/messages`
  (`aria-label="К сообщениям"`, `IconChevronLeft`) + `<h2 className="ui-picker__title">Новое сообщение</h2>`.
- Поле: Mantine `TextInput` (`className="ui-messenger__search"`, `radius="xl"`), `leftSection`
  «Кому:» (текст, `leftSectionWidth` под него) или `IconSearch`, `placeholder="Имя"`,
  `aria-label="Кому: имя"`, `data-autofocus` + `autoFocus`, `rightSection={pending && <Loader size="xs" />}`.
- Задержка 300 мс: `useEffect` на `value` → `setTimeout`; если `value.trim() === q` — ничего; иначе
  `startTransition(() => router.replace(value.trim() === '' ? '/office/messages/new' : `/office/messages/new?q=${encodeURIComponent(value.trim())}`, { scroll: false }))`.
  `router` из `useRouter` стабилен; для typed route — `as Route`, если `tsc` потребует.
- Тело `.ui-picker__body` (скролл), группы:
  - `search` и строки есть → заголовок «Найдено»; `search` и пусто → «Никого не нашлось» +
    подпись «Ищем среди авторов, ваших подписок и подписчиков»;
  - не `search`, строки есть → «Ваши подписки»; пусто → `.ui-chat-list__empty`: «Подпишитесь на
    авторов или найдите человека по имени» + `<Link href="/authors">К авторам</Link>`.
- Строка (`.ui-chat-list` > …), `available = row.hasDialog || row.blockReason === null` (решение 3):
  - `available` → `<Link href={`/office/messages/new?to=${row.id}`} className="ui-chat-row">`, иначе
    `<div className="ui-chat-row ui-chat-row--static" data-disabled="true">`;
  - `UserAvatar` 44, `.ui-chat-row__body` → `.ui-chat-row__top`: имя + при `hasDialog`
    `<span className="ui-picker__badge">есть переписка</span>`; `.ui-chat-row__bottom` →
    `.ui-chat-row__text`: `blockReason ?? label(row)` (решение 2).
- Хелпер `label(row)` — внизу файла (codestyle: неэкспортируемое ниже).

### 6. CSS — `theme/layout.css`, рядом с блоком сообщений
- `.ui-picker__title` — размер/вес как `.ui-dialog__name`, `margin: 0`.
- `.ui-picker__search` (обёртка поля) — `padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--line)`.
- `.ui-picker__body` — `flex: 1; min-height: 0; overflow-y: auto`.
- `.ui-picker__group` — надзаголовок группы (как `.ui-kicker`: мелкий, `--ink-faint`, uppercase),
  `padding: 1rem 1.25rem 0.375rem`.
- `.ui-picker__badge` — мелкая пилюля `--paper-tint` / `--ink-soft`, `font-size: 0.6875rem`.
- `.ui-chat-row[data-disabled='true']` — `opacity: 0.55`, `cursor: default`; текст причины не
  обрезать в одну строку (`white-space: normal`), если `.ui-chat-row__text` режет.
- В `@media (max-width: 720px)` к правилам `:has(.ui-dialog)` добавить `body:has(.ui-dialog) .ui-fab { display: none; }`.
- Шапку раздела в комментарии в начале `layout.css` (строка про сообщения) дополнить `.ui-picker`.

### 7. Кнопка и FAB — `app/office/messages/layout.tsx`
- `OfficeHead action={<ButtonLink href="/office/messages/new" leftSection={<IconMessagePlus size={16} />}>Новое сообщение</ButtonLink>}`.
- Сразу после `OfficeHead`: `<OfficeFab href="/office/messages/new" label="Новое сообщение" icon={IconMessagePlus} />`.
- Комментарий layout дописать: кнопка и FAB ведут в выбор (спека 50); на телефоне выбор — экран,
  как диалог.

### 8. Пустой список — `domains/messages/components/DialogList.tsx`
Текст при `rows.length === 0 && q === ''`:
«Переписок пока нет. Найдите собеседника среди авторов и своих подписок — <Link href="/office/messages/new">Написать сообщение</Link>».

### 9. «Начало» — `domains/messages/components/DialogDigest.tsx`
- Пусто: «Переписок пока нет — <Link href="/office/messages/new">напишите первым</Link>.»
- Низ блока (всегда): `<div className="ui-digest__links">` → `Link .ui-digest__more` «Написать сообщение»
  (`IconMessagePlus` слева, на `/office/messages/new`) и, если `dialogs.length > 0`, «Все сообщения» →.
- CSS `.ui-digest__links { display: flex; flex-wrap: wrap; gap: 1.25rem; }`.
- Комментарий компонента переписать: выбор собеседника теперь есть (спека 50).

### 10. Документы
- `docs/lifecycles/message.md`, «Начать переписку»: дописать, что «автор» — роль `author`
  (решение 1); строка с перепиской ведёт в неё и при запрете, с причиной (решение 3); входы —
  кнопка в шапке «Сообщений», FAB на телефоне, «Написать сообщение» на «Начале», пустой список.
- После реализации: статус спеки и строки 50 в `docs/specs/README.md` — `done` (сейчас — «план»).

### 11. Проверка
- `npx tsc --noEmit`, `npm run lint`.
- Браузер (скил `app-run`, субагент), `alice@example.com` и `bob@example.com`, десктоп и 390px:
  1. «Сообщения» → кнопка «Новое сообщение» → справа выбор, слева список не сбросился; без
     запроса — «Ваши подписки», свежие сверху.
  2. Ввести 1 символ — подсказки; «ал» (кириллица, другой регистр) — «Найдено», адрес `?q=`,
     фокус в поле не теряется, вкладка слева не сбрасывается.
  3. Читатель без связи не находится; подписчик-читатель находится с подписью «Подписчик».
  4. Заблокированный (спека 26) и забаненный не видны; «только от друзей» / запрет — серая строка
     с причиной без ссылки; с существующей перепиской — пометка и переход в диалог.
  5. Клик по доступной строке без переписки — шапка собеседника и поле ввода (`?to=`).
  6. `?to=abc` — 404; `?to=<id>&q=x` — диалог.
  7. Телефон: FAB на списке, тап — экран выбора с «‹», без нижней панели и FAB; «‹» — назад к
     списку; кнопка в шапке скрыта.
  8. «Начало»: «Написать сообщение» и «Все сообщения»; у пользователя без переписок — ссылка в
     выбор.
  9. Staff (`some@example.com`) — тот же круг поиска; «только от друзей» у него не серое.
- Отклонения — в конец спеки.
