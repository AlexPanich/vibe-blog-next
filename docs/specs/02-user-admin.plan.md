# 02. Админка пользователей — план

Спека: [02-user-admin.md](02-user-admin.md). Порядок: схема → вход → домен → actions → UI
→ документы.

## 1. Схема и миграция

`src/database/schema.ts`:

- `users` += `bannedAt` (`integer timestamp`, nullable), `banReason` (`text`, nullable).
- `USER_ADMIN_ACTIONS = ['banned', 'unbanned', 'role_granted', 'role_revoked']`.
- Таблица `userAdminActions` (`user_admin_actions`): `id`, `userId`, `actorId`, `action`,
  `role` (`text enum USER_ROLES`, nullable), `comment`, `createdAt`. Индекс
  `(userId, createdAt)`. Два CHECK:
  - `user_admin_actions_role`: `(action IN ('role_granted', 'role_revoked')) = (role IS NOT NULL)`;
  - `user_admin_actions_ban_comment`: `action <> 'banned' OR length(trim(coalesce(comment, ''))) > 0`.
- Relations: `user`, `actor` у журнала; `adminActions` у `users`.
- `database/types.ts` += `UserAdminAction`.

`npx drizzle-kit generate --name user_admin`, просмотреть SQL, `migrate`. Ожидаемо:
`ALTER TABLE users ADD` двумя колонками и `CREATE TABLE`. Важно проверить, что
better-auth не ломается на новых колонках `users` — они не объявлены в
`additionalFields`, adapter их просто не трогает.

## 2. Вход: хук бана

`src/globals/auth.ts`:

- `databaseHooks.session.create.before`: читает `bannedAt`/`banReason` по
  `session.userId` из `db` напрямую (не через `internalAdapter`: колонки не объявлены в
  better-auth); если забанен — `throw APIError.from('FORBIDDEN', { code: 'USER_BANNED',
  message: banReason })`. Код вынести в константу рядом.

`src/domains/users/actions/authActions.ts`:

- `isBanned(e)` рядом с `isEmailNotVerified`; в `signinAction` и
  `resendVerificationAction` — `actionError(423, 'Аккаунт заблокирован: …')`. Код 423, а
  не 403: `LoginForm` по 403 показывает кнопку повторного письма.
- Попытка остаётся потраченной в `signin` limiter — как неверный пароль (спека §5.3).

## 3. Домен `users`

- `domains/users/policy.ts` (новый):
  - `manageUsers(user)` — `admin`;
  - `manageUser(user, target)` — `admin` и `user.id !== target.id`.
- `domains/users/shared/userAdminActions.ts` (server-only): `USER_ADMIN_ACTION_LABELS`
  для журнала — без рода: «Заблокирован», «Разблокирован», «Выдана роль», «Снята роль».
  Если понадобится клиенту — вынести метки в не-server файл.
- `domains/users/dto/userAdminRequests.ts`:
  - `userRolesDto` — `roles: z.array(z.enum(USER_ROLES))` + `expected: z.array(…)` (набор
    ролей, который админ видел на странице — для проверки устаревания);
  - `userBanDto` — `comment` обязателен, «Укажите причину блокировки», max 2000;
  - `userUnbanDto` — `comment` необязателен;
  - `userAdminFilterDto` — `filter: z.enum(['banned']).optional().catch(undefined)`.
- `domains/users/dto/userResources.ts`:
  - `userRolesFormResource` — `id`, `roles`;
  - `userBanFormResource` — `id`.

## 4. Actions: `domains/users/actions/userAdminActions.ts`

Общий шаг каждого action: `breakIfCant(u => manageUser(u, target))`, затем изменение в
`db.transaction` (синхронная, better-sqlite3), где первым делом:

- перепроверить, что действующий всё ещё `admin` и не забанен (спека, решение 6) — иначе
  `actionError(403, …)`;
- условный `UPDATE … WHERE` по ожидаемому состоянию цели; 0 строк — `actionError(409,
  'Пользователь уже изменился — обновите страницу')`;
- запись в журнал.

Конкретно:

- `updateUserRolesAction` — `WHERE roles = JSON(expected)`. Роли хранятся строкой JSON,
  которую пишет better-auth, поэтому сравнивать строки после одинаковой сериализации:
  порядок — как в `USER_ROLES`. Перед записью нормализовать и `roles`, и `expected`
  тем же порядком. Журнал — по записи на разницу. Пустая разница — без записи и без 409.
- `banUserAction` — `WHERE bannedAt IS NULL`, ставит `bannedAt`, `banReason`; в той же
  транзакции `DELETE FROM sessions WHERE userId = target`.
- `unbanUserAction` — `WHERE bannedAt IS NOT NULL`, обнуляет обе колонки.

После каждого — `revalidatePath` не нужен (страницы dynamic), `redirect` на страницу
пользователя.

Проверка на сравнение строк ролей: better-auth пишет `["admin"]` без пробелов
(`JSON.stringify`), сиды — так же. Если в БД окажется иначе, `UPDATE` даст 409 и это
станет видно на проверке.

## 5. UI

### Компоненты `domains/users/components/`

- `UserRow` — строка списка: имя, email, теги ролей, статус-бейджи, число постов, дата.
- `UserStatusTags` — «Заблокирован» / «Email не подтверждён».
- `UserRolesForm` (client) — `Checkbox.Group` по `USER_ROLES`, «Сохранить»; ошибка 409
  текстом под формой.
- `UserBanForm` (client) — `mode: 'ban' | 'unban'`, по образцу `PostBlockingForm`;
  `key` по режиму на странице.
- `UserAdminHistory` — журнал, плашки как `PostModerationHistory`: формат «действие ·
  кто · дата», `banned` — `ui-note--danger`.

### Страницы

- `app/office/admin/users/page.tsx` — `breakIfCant(manageUsers)`, фильтр `.ui-filter`
  «Все / Заблокированные», запрос users + `count(posts)` подзапросом, сортировка
  `desc(createdAt)`.
- `app/office/admin/users/[id]/page.tsx` — `idOrFail`, `breakIfCant(manageUsers)`, 404
  если нет; шапка, блоки ролей и бана (если `manageUser(me, target)`, иначе строка
  «Свои роли и блокировку менять нельзя»), журнал с `actor`.
- `components/navigation/OfficeMenu.tsx` — пункт «Пользователи» (`IconUsers`,
  `roles: ['admin']`).

### Стили

- `.ui-status[data-status='banned']` — если для бейджа пользователя переиспользуем
  `ui-status`; иначе `ui-tag` с модификатором. Решить по месту, цвета — только токены.

## 6. История модерации без рода (решение из обсуждения спеки)

`PostModerationHistory`: «Одобрил {имя}» → «Одобрено · {имя} · дата», так же для
«Отклонено», «Заблокировано», «Разблокировано». Формат совпадает с журналом
пользователей.

## 7. Документы

- `docs/lifecycles/user.md`: состояние «Заблокирован» (вход закрыт, сессии отозваны,
  контент остаётся), кто назначает роли и правило «себя не трогать», журнал. Из
  «Открытых вопросов» убрать два закрытых, оставить про срок жизни ссылки.
- `CLAUDE.md`, раздел Auth: хук бана в `databaseHooks`, код 423 в форме входа.
- Спека → `done`, отклонения — в спеку.

## 8. Проверка

- `npx tsc --noEmit`, `npm run lint`.
- Через `app-run` (входы экономно: лимит 5 в минуту на IP+email):
  1. `alice` (admin): «Пользователи» в меню, список, `bob` — посты посчитаны.
  2. Роли: выдать `bob` роль `moderator` → в журнале «Выдана роль moderator»; `bob` видит
     «Очередь» в меню без перелогина. Снять обратно.
  3. Устаревание ролей: страница `bob` открыта в двух вкладках, сохранить в первой,
     затем во второй → «пользователь уже изменился».
  4. Бан без причины — ошибка поля; с причиной — `bob`, залогиненный в другом
     контексте, на следующем запросе уходит на вход; вход `bob` → «Аккаунт заблокирован:
     <причина>», кнопки повторного письма нет.
  5. Пост `bob` в ленте остаётся виден.
  6. Разбан → `bob` входит.
  7. Своя страница `alice`: блоков ролей и бана нет.
  8. `some` (moderator): пункта меню нет, `/office/admin/users` → 403.
  9. Повтор action бана с устаревшей страницы (уже забанен) → «уже изменился».
- Проверка CHECK журнала прямым insert в откатываемой транзакции, как в 01.
