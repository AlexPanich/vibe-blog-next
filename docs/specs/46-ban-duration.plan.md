# 46. Срок блокировки пользователя — план

Спека — `46-ban-duration.md` (решения 1–8 обсуждены). Одна миграция (`0028`, руками через
`ADD COLUMN`), lifecycle `user.md` — правки. Образцы: миграция — `0023_profile_cover_name.sql` /
`0027_author_stats.sql`, радио-пилюли — `MessagesFromForm` (`role="radiogroup"`), действие
admin — `banUserAction`.

## Решения плана (в спеке не было или уточнено)

1. **CHECK на `until` в `ADD COLUMN` проходит.** Проверено на SQLite 3.53 (версия из
   `better-sqlite3` проекта): `ALTER TABLE … ADD until integer CHECK (until IS NULL OR action = 'banned')`
   применяется, и SQLite его соблюдает (`CHECK constraint failed: until`). Отклонения от спеки нет.
2. **Хелпер — `src/shared/userBan.ts`, без `server-only`.** Нужен трём доменам
   (`users`, `messages`, `notifications`) и `globals/auth.ts`, поэтому лежит в корневом `shared/`. Файл
   чистый: импортирует только `drizzle-orm` и `@/database/schema`, db-инстанса нет.
   ```ts
   // Бан действует: bannedAt есть, а срок не задан (навсегда) или ещё не наступил (спека 46)
   export function isBanActive(u: Pick<User, 'bannedAt' | 'bannedUntil'>, now = new Date()): boolean
   // То же условие для WHERE и CASE
   export function banActiveSql(now = new Date()): SQL
   //   and(isNotNull(users.bannedAt), or(isNull(users.bannedUntil), gt(users.bannedUntil, now)))
   ```
   `now` — параметр JS, не `unixepoch()`: drizzle сам переводит `Date` в секунды колонки.
3. **Сроки — константа `BAN_TERMS` в `domains/users/shared/banTerms.ts`** (без `server-only`,
   нужна форме и action): `{ '7d': { label: '7 дней', days: 7 }, '30d': { label: '30 дней', days: 30 }, forever: { label: 'Навсегда', days: null } }`,
   `DEFAULT_BAN_TERM = '7d'`, функция `banUntil(term, now): Date | null` — `now + days × 24 ч`.
   Срок считает сервер в action, клиент передаёт только ключ.
4. **Истёкший бан для admin — как его нет.** `banUserAction` на цели с истёкшим баном не
   даёт 409, а перезаписывает `bannedAt` / `banReason` / `bannedUntil`. `unbanUserAction` на
   истёкшем бане — `staleError()` (страница уже показывает форму бана). Обе проверки — через
   `isBanActive(target)`.
5. **Ленивая уборка в хуке — условным UPDATE:**
   `WHERE id = ? AND banned_until IS NOT NULL AND banned_until <= now`. Если между чтением и
   уборкой admin успел забанить заново, новый срок в будущем (или NULL) под условие не
   попадёт и не сотрётся.
6. **Срок до формы входа — полем `ban` в `ActionServerError`.** Тип в `globals/actionClient.ts`
   получает необязательное `ban?: { reason: string, until: string | null }` (ISO-строка:
   payload action сериализуется). `message` остаётся «Аккаунт заблокирован: <причина>» —
   запасной текст. Из хука срок уходит в теле `APIError`
   (`new APIError('FORBIDDEN', { code: USER_BANNED_CODE, message: reason, until: iso | null })`).
   **Проверить при реализации**, что `e.body.until` доходит до `throwSigninError`; если
   better-call лишние поля срезает — в `throwSigninError` прочитать `banReason` / `bannedUntil`
   из `users` по `parsedInput.email` (пароль к этому моменту уже проверен, бан не раскрывается),
   и записать это в конец спеки.
7. **Формат дат.** «до 16 ноября» — `LocalDate` с `{ day: 'numeric', month: 'long' }`; в
   списке — `{ day: 'numeric', month: 'short' }` («16 нояб.»). Срок не больше 30 дней, год не
   выводится. Дата бана в карточке — как сейчас, с годом.
8. **Журнал: текст события разбирается на части.** Сейчас `AdminUserEvent.text` — готовая
   строка с « · actor» в конце, а дату срока нужно вставить компонентом. Событие получает
   необязательное `banUntil?: Date | null` (есть только у `banned`; `null` — навсегда);
   `text` остаётся без actor, actor — отдельным полем `actor: string | null`. Старые записи
   `banned` (до миграции) — `until` NULL, показываются «навсегда»: это совпадает с решением 7
   спеки.
9. **GitHub-вход** с действующим баном ведёт себя как сейчас (ошибка better-auth на
   callback), с истёкшим — уборка и вход. Отдельной страницы ошибки не делаем.
10. **Демо-сид:** в `fill.ts` к сбросу `bannedAt: null, banReason: null` добавить
    `bannedUntil: null` — иначе `seed-dev` поверх dev-базы оставит срок у бывших
    заблокированных. Заблокированных сид по-прежнему не создаёт.

## Шаги

### 1. Схема и миграция
- `src/database/schema.ts`, `users` после `banReason`:
  ```ts
  // Срок бана (спека 46): null при bannedAt — навсегда. Бан истёк — поля чистит хук входа (globals/auth.ts)
  bannedUntil: integer('banned_until', { mode: 'timestamp' }),
  ```
- `userAdminActions` после `comment`:
  ```ts
  // Срок из записи banned (спека 46): null — навсегда или не бан
  until: integer('until', { mode: 'timestamp' }),
  ```
  в третий аргумент — `check('user_admin_actions_until', sql\`${t.until} IS NULL OR ${t.action} = 'banned'\`)`.
- `npx drizzle-kit generate --name ban_duration` → снапшот в `drizzle/meta`. Сгенерированный
  SQL (там будет пересборка `__new_user_admin_actions`) **заменить** руками:
  ```sql
  ALTER TABLE `users` ADD `banned_until` integer;--> statement-breakpoint
  ALTER TABLE `user_admin_actions` ADD `until` integer CHECK (`until` IS NULL OR `action` = 'banned');
  ```
- Прогон на копии `storage/dev.db` через `npm run db:migrate` (с подменённым путём или
  копией), потом на dev. `touch next.config.ts`, если dev-сервер не видит новые колонки.

### 2. Хелперы
- `src/shared/userBan.ts` — `isBanActive`, `banActiveSql` (реш. 2).
- `src/domains/users/shared/banTerms.ts` — `BAN_TERMS`, `BanTerm`, `DEFAULT_BAN_TERM`, `banUntil` (реш. 3).

### 3. Замена голых проверок `bannedAt`
Все места из `grep -rn "bannedAt" src` (кроме записи в actions и схемы):
- `globals/auth.ts`, хук `session.create.before`: колонки `bannedAt, banReason, bannedUntil`;
  `isBanActive` → `APIError` с `until`; иначе, если `bannedAt` есть (истёк) — условный UPDATE
  (реш. 5), вход идёт. Комментарий над хуком дополнить.
- `domains/users/shared/loadAdminUsers.ts`: фильтр `banned` — `banActiveSql()`, счётчик —
  `sql<number>\`count(case when ${banActiveSql()} then 1 end)\``; в строку добавить `bannedUntil`.
  `now` один на вызов `loadAdminUsers` (передать в обе функции).
- `domains/users/components/admin/UserAdminRow.tsx`: `banned={isBanActive(user)}`, рядом с
  пилюлей — `ui-admin-users__ban-term` «до <LocalDate short>» / «навсегда» (в обеих копиях —
  desktop и mobile).
- `domains/users/components/admin/UserAdminHero.tsx`: `Pick` + `bannedUntil`, пилюля по `isBanActive`.
- `app/office/admin/users/[id]/page.tsx`: `const banned = isBanActive(user)` — для `back` и выбора
  карточки (шаг 5).
- `domains/messages/shared/messageAccess.ts` (`writeBlockReason`): выбрать `bannedUntil`,
  `if(isBanActive(recipient))`.
- `domains/messages/shared/loadMessagePicker.ts`: `isNull(users.bannedAt)` → `not(banActiveSql())`.
- `domains/notifications/shared/notify.ts` — `staffIds`, `adminIds`: то же.
- `domains/users/shared/userAdminTransaction.ts`: actor и target выбирают `bannedUntil`,
  `AdminTarget` — с ним; проверка actor — `isBanActive(actor)`.
- `domains/users/shared/loadAdminAuthorRequests.ts`: `userBannedUntil`, `banned: isBanActive({ bannedAt, bannedUntil })`.

### 4. Actions и dto
- `dto/userAdminRequests.ts`: `userBanDto` + `term: z.enum(Object.keys(BAN_TERMS))` (через
  `as [BanTerm, ...BanTerm[]]` или отдельный `BAN_TERM_KEYS`), `.default(DEFAULT_BAN_TERM)`.
- `actions/userAdminActions.ts`, `banUserAction`: `if(isBanActive(target)) staleError()`;
  `const until = banUntil(parsedInput.term, new Date())`; в UPDATE — `bannedUntil: until`; в
  журнал — `until`. `unbanUserAction`: `if(!isBanActive(target)) staleError()`, UPDATE чистит и
  `bannedUntil: null`.
- `actions/authActions.ts`, `throwSigninError`: `actionError` не умеет доп. поля — для 423
  вызвать `returnServerError<ActionServerError>({ code: 423, message: …, ban: { reason, until } })`
  (или расширить `actionError` необязательным третьим аргументом `extra`). Реш. 6.
- `globals/actionClient.ts`: поле `ban?` в `ActionServerError` с комментарием.

### 5. UI админки
- `UserBanForm.tsx`, режим `ban`: над причиной — радиогруппа из трёх пилюль `BAN_TERMS`
  (`role="radiogroup"` / `role="radio"` + `aria-checked`, как `MessagesFromForm`), по
  умолчанию `DEFAULT_BAN_TERM`; `useForm({ comment: '', term })`. Стиль —
  `.ui-user-ban__terms` / `.ui-user-ban__term` рядом с `.ui-user-ban` в `layout.css`, цвета из
  токенов, выбранная — как активный сегмент `.ui-segments`. Свериться с макетом «Админ —
  Пользователь» в Pencil. Убрать из комментария «Срока блокировки нет — спека 46».
- `page.tsx`, карточка заблокированного: hint
  «Заблокирован <LocalDate с годом> · до <LocalDate long>» или «· навсегда».
- Карточка незаблокированного (в т.ч. с истёкшим сроком) — форма бана, как сейчас.

### 6. Журнал
- `loadAdminUser.ts`, `loadEvents`: выбрать `userAdminActions.until`; события —
  `{ …, text, actor, banUntil }` по реш. 8 (у модераций и заявок `actor` тоже отдельно).
- `UserAdminLog.tsx`: `{ e.text }{ e.banUntil !== undefined && (e.banUntil ? <> до <LocalDate long/></> : ' навсегда') }{ e.actor && \` · ${e.actor}\` }`
  — итог «Заблокирован до 16 ноября · Alice» и причина строкой ниже, как сейчас.

### 7. Форма входа — `LoginForm.tsx`
- `const ban = action.result.serverError?.code === 423 ? action.result.serverError.ban : undefined`.
- В `Alert`: при `ban?.until` — «Аккаунт заблокирован до <LocalDate value={new Date(ban.until)} long />: {ban.reason}»,
  иначе — `serverError.message` как сейчас.

### 8. Демо-сид
- `scripts/seed-demo/fill.ts`: `bannedUntil: null` в `values` (реш. 10).

### 9. Lifecycle — `docs/lifecycles/user.md`
- «Заблокирован» (стр. ~34): вместо «Бан бессрочный» — сроки 7/30 дней/навсегда (по умолч. 7,
  точный момент `now + N × 24 ч`); истечение вычисляется, записи и уведомления нет; при входе
  истёкшие поля чистятся; срок действующего бана не меняется — разблокировать и заблокировать
  заново; форма входа показывает срок.
- «Журнал» (стр. ~107): у записи бана — срок («до …» / «навсегда»), строки об истечении нет.
- «Уведомления» (стр. ~174): `user.unbanned` — только при ручном разбане.

### 10. Спека и README
- После реализации: спека — статус «реализовано, следующая фаза — проверка», README — строка 46.
  После проверки — `done`.

## Проверка

- `npx tsc --noEmit`, `npm run lint`.
- `mcp sql-dev`: `schema` — колонки есть; `exec` вставки `until` у `unbanned` падает по CHECK.
- Браузер (скил `app-run`, alice — admin):
  1. Заблокировать bob на 7 дней — карточка «Заблокирован … · до <дата+7>», в списке «до …»,
     вкладка «Заблокированные» +1, журнал «Заблокирован до … · Alice» + причина.
  2. Вход bob — «Аккаунт заблокирован до <дата>: <причина>».
  3. Разблокировать, заблокировать «навсегда» — карточка «· навсегда», вход — «Аккаунт
     заблокирован: <причина>».
  4. Истечение: через `sql-dev` выставить bob `banned_until` в прошлое — в списке обычный,
     счётчик «Заблокированные» −1, bob виден в выборе собеседника; вход bob проходит, после
     входа `banned_at` / `ban_reason` / `banned_until` — NULL, в журнале новой записи нет,
     уведомления `user.unbanned` нет.
  5. Повторный бан на цели с истёкшим сроком (без входа) — проходит без 409.
- Отклонения — в конец спеки.
