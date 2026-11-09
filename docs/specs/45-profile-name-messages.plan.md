# 45. Профиль: смена имени и «Кто может мне писать» — план

Спека — `45-profile-name-messages.md` (решения 1–12 обсуждены). Одна миграция (`0024`, руками),
lifecycle `message.md` и `user.md` — правки. Образцы: миграция — `0023_profile_cover_name.sql`,
форма-радио — нынешний `MessagesFriendsOnlyForm`, action профиля — `updateBioAction`.

## Решения плана (в спеке не было или уточнено)

1. **Одна кнопка «Сохранить» на «Публичную страницу», два action.** Форма `UserBioForm` держит
   два `useAction`: `updateBioAction` (как сейчас) и `updateNameAction`. По submit всегда уходит
   bio; имя — только если после нормализации отличается от текущего. Запросы независимы:
   ошибка имени (429, валидация) показывается под полем «Имя», «О себе» при этом сохранено
   (спека, п. 4 UI). Вторая кнопка в секции макету не нужна.
2. **Пока сутки не прошли — поле «Имя» `readOnly`**, подпись «Менять можно раз в сутки — снова
   можно <LocalDate>». Сервер считает `nextChangeAt` при рендере страницы и отдаёт форме.
   Поэтому 429 бывает только у устаревшей страницы (другая вкладка).
3. **Текст 429 без даты**: «Имя можно менять раз в сутки». Дату на сервере пришлось бы
   форматировать в его часовом поясе. По 429 форма делает `router.refresh()`, и подпись под
   полем показывает дату через `LocalDate` в поясе браузера. Отличие от текста в спеке
   (п. 3) — дописать в конец спеки при проверке.
4. **Сутки — 24 часа от `name_changed_at`**, а не календарные. Константа и расчёт —
   `domains/users/shared/nameChange.ts` (чистые функции, без `server-only`), общие для action
   и страницы.
5. **CHECK на длину `name` нет** (спека, §3). Фраза в п. 2 спеки про CHECK устарела: длина
   проверяется только zod.
6. **CHECK на `messages_from` — на колонке в SQL и табличный в `schema.ts`**, как
   `users_name_genitive_check` в 0023: снапшот drizzle-kit согласован со схемой, SQL написан
   руками.
7. **Правило ответа — внутри `writeBlockReason`**, после проверки staff и настройки: дорогой
   запрос (есть ли в диалоге сообщение получателя) идёт только когда настройка запрещает.
   Отдельной функции наружу не нужно: все пять мест, где вызывается `writeBlockReason`,
   получают правило сами.
8. **`following` = получатель подписан на отправителя**:
   `userFollows.followerId = recipientId AND followingId = sender.id` (PK `follower, following`
   — запрос по ключу). `areFriends` удаляется.

## Шаги

### 1. Схема и миграция
- `src/database/schema.ts`, рядом с `USER_ROLES`:
  ```ts
  // Кто может написать мне первым (спека 45); ответ в своём диалоге можно всегда
  export const MESSAGES_FROM = ['all', 'following', 'nobody'] as const;

  export type MessagesFrom = (typeof MESSAGES_FROM)[number];
  ```
- `users`: `messagesFriendsOnly` заменить на
  ```ts
  /*
    Кто может начать со мной переписку (спека 45): все, мои подписки, никто. Staff обходит,
    ответ в диалоге, где я писал, — всегда. better-auth колонку не знает, пишет updateMessagesFromAction
  */
  messagesFrom: text('messages_from', { enum: MESSAGES_FROM }).notNull().default('all'),
  ```
  после `banReason`/`bio` — там, где был флаг. После `nameGenitive`:
  ```ts
  // Последняя смена имени (спека 45): не чаще раза в сутки; null — не меняли. Пишет updateNameAction
  nameChangedAt: integer('name_changed_at', { mode: 'timestamp' }),
  ```
  В третий аргумент `sqliteTable` — `check('users_messages_from_check', sql\`${t.messagesFrom} IN ('all', 'following', 'nobody')\`)`.
- `npx drizzle-kit generate --name profile_name_messages` → `drizzle/0024_profile_name_messages.sql`.
  Генератор пересоберёт `users` — SQL заменить руками, снапшот оставить:
  ```sql
  /*
    Написано руками вместо сгенерированного: drizzle-kit пересобирал users ради CHECK и DROP
    COLUMN, а DROP TABLE users в транзакции миграции падает на внешних ключах (см. 0021, 0023).
    CHECK на колонке по смыслу равен табличному users_messages_from_check из schema.ts.
    DROP COLUMN без пересборки: у messages_friends_only нет индекса, UNIQUE, FK и CHECK
  */
  ALTER TABLE `users` ADD `messages_from` text DEFAULT 'all' NOT NULL CONSTRAINT "users_messages_from_check" CHECK("messages_from" IN ('all', 'following', 'nobody'));--> statement-breakpoint
  UPDATE `users` SET `messages_from` = 'following' WHERE `messages_friends_only` = 1;--> statement-breakpoint
  ALTER TABLE `users` DROP COLUMN `messages_friends_only`;--> statement-breakpoint
  ALTER TABLE `users` ADD `name_changed_at` integer;
  ```
- Прогон на копии: `cp storage/dev.db storage/dev.db.bak-45`; перед миграцией через MCP `sql-dev`
  поставить одному пользователю `messages_friends_only = 1`, после `npm run db:migrate` проверить
  `schema` users и что у него `following`, у остальных `all`. Затем `touch next.config.ts`.

### 2. Имя: dto и helper
- `domains/users/dto/authRequests.ts`, над `userSignupDto`:
  ```ts
  export const USER_NAME_MIN = 2;
  export const USER_NAME_MAX = 24;

  /* Имя (спека 45): одно правило при регистрации и в профиле; пробелы схлопываются до проверки длины */
  const name = z.string().transform(normalizeName)
    .pipe(z.string().min(USER_NAME_MIN, `Не короче ${USER_NAME_MIN} символов`).max(USER_NAME_MAX, `Не длиннее ${USER_NAME_MAX} символов`));
  ```
  `userSignupDto.name` → `name`. Новый `userNameDto = z.object({ name })` + тип `UserNameDto`.
- `SignupForm.tsx`: `maxLength={USER_NAME_MAX}` на поле имени (если там стоит 16 или ничего —
  поставить).
- `domains/users/shared/nameChange.ts`:
  ```ts
  export const NAME_CHANGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

  // Когда снова можно сменить имя; null — уже можно (или ещё не меняли)
  export function nextNameChangeAt(changedAt: Date | null, now = new Date()): Date | null

  // trim и повторные пробелы в один — до проверки длины и до сравнения со старым именем
  export function normalizeName(value: string): string
  ```

### 3. Action — `domains/users/actions/userAccountActions.ts`
```ts
/*
  Смена имени (спека 45): не чаще раза в сутки по name_changed_at — переживает перезапуск, и
  форма знает, когда снова можно. То же имя — не смена. Имя видно везде, поэтому сброс всего кэша
*/
export const updateNameAction = actionAuthClient
  .inputSchema(userNameDto)
  .action(async ({ parsedInput: { name }, ctx: { auth: user } }) => {
    const changed = db.transaction(tx => {
      const row = tx.select({ name: users.name, nameChangedAt: users.nameChangedAt }).from(users).where(eq(users.id, user.id)).get();
      // row есть: пользователь из сессии
      if(row.name === name){ return false; }
      if(nextNameChangeAt(row.nameChangedAt)){ actionError(429, 'Имя можно менять раз в сутки'); }
      const now = new Date();
      tx.update(users).set({ name, nameChangedAt: now, updatedAt: now }).where(eq(users.id, user.id)).run();
      return true;
    });

    if(changed){
      revalidatePath('/', 'layout');
    }

    return { changed };
  });
```
(форматирование — по `codestyle.md`, псевдокод выше сжат). `actionError` бросает внутри
транзакции — откат, как в других actions. Сессию better-auth трогать не нужно: `cookieCache` не
включён, `getSession` читает пользователя из БД.

### 4. Форма имени — `UserBioForm.tsx`, страница профиля
- `domains/users/dto/userResources.ts` — ресурс для формы (скил `resource`):
  ```ts
  // «Публичная страница» в профиле (спека 45): имя и когда его снова можно сменить
  export const userNameStateResource = z.object({ name: z.string(), nextChangeAt: z.date().nullable() })
  ```
- `app/office/profile/page.tsx`: в `columns` — `nameChangedAt: true, messagesFrom: true` вместо
  `messagesFriendsOnly`. В `UserBioForm` — `nameState={resource(userNameStateResource, { name: user.name, nextChangeAt: nextNameChangeAt(profile?.nameChangedAt ?? null) })}`
  вместо `name`. hint секции «Публичная страница» не меняется.
- `UserBioForm` (решения 1–3):
  - `useForm({ name: nameState.name, bio, nameGenitive })`; `const router = useRouter()`.
  - `nameAction = useAction(updateNameAction, { onSuccess: ({ data }) => data.changed && router.refresh(), onError: ({ error }) => error.serverError?.code === 429 && router.refresh() })`
    (форму `serverError` — проверить по `ActionServerError` в `globals/actionClient.ts`).
  - submit: `bioAction.execute({ bio, nameGenitive })`; если `normalizeName(data.name) !== nameState.name`
    и `!nameState.nextChangeAt` — `nameAction.execute({ name: data.name })`. `normalizeName` —
    тот же, что в dto (шаг 2): правило одно.
  - Поле «Имя»: `maxLength={USER_NAME_MAX}`, `readOnly` и `variant="filled"` при `nextChangeAt`;
    description — «Видно на странице автора, у постов и комментариев. Менять можно раз в сутки»,
    при `nextChangeAt` — «Менять можно раз в сутки — снова можно <LocalDate value={nextChangeAt} />».
    error — `fieldError(nameAction.result.validationErrors, 'name') ?? nameAction.result.serverError?.message`.
  - `loading` кнопки — `bioAction.isPending || nameAction.isPending`. Alert «Сохранено…» — как
    сейчас, по `bioAction`; при `nameAction.result.data?.changed` текст — «Сохранено. Новое имя
    видно везде».
  - Комментарий над компонентом обновить (убрать «сменить нельзя до спеки 45»).
  - `LocalDate` — клиентский, гидрация по скилу `hydration` уже решена внутри.

### 5. Кто может писать — `domains/messages/shared/messageAccess.ts`
- В select получателя — `messagesFrom: users.messagesFrom` вместо `friendsOnly`.
- Хвост `writeBlockReason` (после `isRestricted`):
  ```ts
  const staff = …;

  if(staff || recipient.messagesFrom === 'all'){
    return null;
  }

  if(recipient.messagesFrom === 'following' && follows(tx, recipientId, sender.id)){
    return null;
  }

  // Ответ всегда можно (спека 45, п. 9): получатель сам писал в этом диалоге
  if(hasWrittenTo(tx, recipientId, sender.id)){
    return null;
  }

  return MESSAGES_FROM_REASONS[recipient.messagesFrom];
  ```
  ```ts
  const MESSAGES_FROM_REASONS = {
    following: 'Пользователь принимает сообщения только от тех, на кого подписан',
    nobody: 'Пользователь не принимает новые сообщения'
  } as const;
  ```
  (константа — внизу файла, по `codestyle.md`).
- Private-функции внизу файла: `follows(tx, followerId, followingId)` — select по PK
  `userFollows`; `hasWrittenTo(tx, authorId, peerId)` — `findDialogBetween`, затем
  `exists` сообщения с `dialogId` и `userId = authorId` (`.limit(1)`, индекс
  `messages_dialog_idx` сужает до диалога). `areFriends` удалить.
- Комментарий над `writeBlockReason`: «Staff обходит настройку получателя (`messages_from`), но не
  запрет и блокировку. Ответ в диалоге, где получатель писал, — всегда».
- `loadMessagePicker.ts`, `loadMessages.ts`, `messageActions.ts` — без изменений (проверить, что
  в комментариях нет «только от друзей»: `grep -rn "друз" src`).

### 6. Настройка — dto, action, форма
- `messageRequests.ts`: `messagesFriendsOnlyDto` → `messagesFromDto = z.object({ messagesFrom: z.enum(MESSAGES_FROM) })`
  (`MESSAGES_FROM` из `@/database/schema`).
- `messageSettingsActions.ts`: `updateMessagesFriendsOnlyAction` → `updateMessagesFromAction`,
  пишет `{ messagesFrom }`, `revalidatePath('/office/profile')`, возвращает `{ messagesFrom }`.
  Страница автора открытого поста получает правило при следующем `messageStateAction` — кэш не
  сбрасываем, как сейчас.
- `MessagesFriendsOnlyForm.tsx` → `git mv` в `MessagesFromForm.tsx`: проп `messagesFrom: MessagesFrom`
  (строка из enum — через `resource(z.enum(MESSAGES_FROM), …)` на странице, тип пропа —
  `StrictResource`, по скилу `resource`), три `OPTIONS`:
  ```ts
  { value: 'all', label: 'Все', text: 'Любой пользователь' },
  { value: 'following', label: 'Мои подписки', text: 'Те, на кого вы подписаны' },
  { value: 'nobody', label: 'Никто', text: 'Новые переписки закрыты' },
  ```
  Заметка: «Ответить вам можно всегда, если вы написали первым. Модераторы и администраторы могут
  написать всегда». Комментарий над компонентом обновить.
- CSS не меняется: `.ui-account-options` — `repeat(auto-fit, minmax(13rem, 1fr))`, три карточки
  встанут в ряд сами, на узком экране — столбиком. Проверить в браузере, что в колонке профиля
  на десктопе хватает ширины на три по 13rem; не хватает — уменьшить `minmax` только для
  трёх карточек модификатором (`.ui-account-options--3`), `PostFavoritesPublicForm` не трогать.
- `office/profile/page.tsx`: импорт и `<MessagesFromForm messagesFrom={…} />`.

### 7. Демо-сид — `scripts/seed-demo/`
- `people.ts`, тип `Person`: `messagesFrom?: MessagesFrom` с комментарием «Кто может написать
  первым (спека 45)»; импорт типа из `schema.ts` (относительный, с `.ts`).
- `pavel` → `messagesFrom: 'following'`, `vera` → `messagesFrom: 'nobody'` (читатели без
  демо-диалогов — правило ответа в демо не мешает).
- `fill.ts`, `values` пользователя: `messagesFrom: person.messagesFrom ?? 'all'`.
- `Dockerfile` — новых файлов для скриптов нет.

### 8. Lifecycle
- `docs/lifecycles/message.md`, «Кто может писать»: строку «только от друзей» заменить двумя:
  `| у получателя «Мои подписки», он на меня не подписан, ответа нет, я не staff | «Пользователь принимает сообщения только от тех, на кого подписан» |`,
  `| у получателя «Никто», ответа нет, я не staff | «Пользователь не принимает новые сообщения» |`.
  Под таблицей — абзац: настройка `messages_from` (`all` / `following` / `nobody`, по умолчанию
  `all`); «ответа нет» = в нашем диалоге нет ни одного сообщения получателя (вычисляется:
  удалил свои — исключение пропало); staff обходит настройку целиком, но не бан, блокировку и
  запрет. Строки 45, 53, 83 — «только от друзей» → «настройка получателя».
- `docs/lifecycles/user.md`, «Публичная страница»: абзац про имя — 2–24 символа после
  схлопывания пробелов (одно правило с регистрацией), меняется в профиле не чаще раза в 24 часа
  (`name_changed_at`), то же имя — не смена, уникальность не требуется, истории нет.
  Про `messages_from` — одна строка со ссылкой на `message.md`.

### 9. Спека и README
- После реализации: `docs/specs/README.md`, строка 45 — статус `done`, шапка спеки — «готово».

## Проверка

- `npx tsc --noEmit`, `npm run lint`; `grep -rn "FriendsOnly\|friends_only\|друз" src scripts docs/lifecycles` — пусто
  (кроме исторических миграций `drizzle/`).
- В браузере (скил `app-run`, субагентом):
  1. Профиль bob: сменить имя на « Борис   Б » → в шапке и на `/authors/<id>` «Борис Б»; поле
     стало readOnly с «снова можно …». Вторая вкладка со старой страницей: смена имени → ошибка
     «раз в сутки» под полем, «О себе» сохранилось, после refresh — дата.
  2. Имя из 1 символа и из 25 — ошибки длины; регистрация с именем 20 символов проходит.
  3. bob ставит «Никто»: anya (в диалоге anya↔bob bob отвечал) может писать; dan (диалог есть,
     bob не отвечал) и eva (диалога нет) видят причину «не принимает новые сообщения» — в шапке
     диалога, на `/authors/<bob>`, в выборе собеседника серой строкой. some (moderator) пишет
     bob без препятствий.
  4. bob ставит «Мои подписки»: тот, на кого bob подписан, пишет; остальные — причина
     «только от тех, на кого подписан».
  5. Три карточки на десктопе в ряд, на телефоне (390 px) — столбиком; «Избранное» не сломалось.
- Отклонения — в конец спеки (в том числе решение 3 про текст 429).
