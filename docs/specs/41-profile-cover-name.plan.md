# 41. Профиль: своя обложка и имя в родительном падеже — план

Спека — `41-profile-cover-name.md` (решения 1–7 обсуждены). Одна миграция (`0023`, руками),
lifecycle `user.md` — правки. Образец почти для всего — аватар (спека 17): загрузка в профиле,
удаление admin-ом с журналом и уведомлением.

## Решения плана (в спеке не было или уточнено)

1. **Варианты обложки — по ширине, а не по длинной стороне.** `saveImageVariants` режет по
   длинной стороне: у портретного фото вариант «1600» был бы шириной ~1070 px, и баннер шириной
   1280 размылся бы. Новая функция `saveWidthVariants(buffer, widths)` в `shared/images.ts` —
   `resize({ width, withoutEnlargement: true })`, webp 82. Ширины — `COVER_WIDTHS = [ 1600, 800 ]`
   в `core/imageUrl.ts` (оба размера уже есть в `UPLOAD_FILE_PATTERN`, роут `uploads` не меняется).
   Кадр — CSS `object-fit: cover` по центру, как сейчас у обложки поста (спека, п. 1).
2. **Размеры своей обложки не храним.** Высота баннера и карточки задана в CSS
   (`.ui-author-head__band`, `.ui-spotlight__cover`), `width`/`height` у `<img>` там ничего не
   решают. Проп `cover` у `AuthorHead` / `AuthorSpotlight` — `{ fileKey, width?, height? }`; своя
   обложка приходит без размеров.
3. **Выбор обложки — одна функция** `authorCover(coverKey, postCover)` в
   `domains/users/shared/authorCover.ts`: своя → `{ fileKey: coverKey }`, иначе обложка поста
   или `null`. Обложку последнего поста не грузим, если есть своя (страница автора — запрос
   `last` условный; `/authors` — `lastPostCovers` только для авторов без своей).
4. **Родительный падеж — в той же форме, что «О себе»** (`UserBioForm`, секция «Публичная
   страница», под «Имя»), тот же `updateBioAction` с расширенным dto. Отдельная кнопка ради
   одного поля не нужна. Правило «одно-два слова»: после `trim` внутренние пробелы схлопываются в
   один, слов ≤ 2, длина ≤ 40; пусто → `null` (спека, п. 6).
5. **Кэш страницы поста.** `/posts/[id]` кэшируется (комментарии делают
   `revalidatePath('/posts/[id]', 'page')`). Поэтому при смене `nameGenitive` action делает то же;
   при неизменном — нет (сброс всех страниц постов ради «О себе» не нужен).
6. **Секция «Обложка» в профиле — у всех**, как аватар: страница `/authors/[id]` есть у каждого
   пользователя (`user.md`, «Публичная страница»). Место — сразу после «Аватар». Превью — полоса
   пропорций баннера; без своей обложки в превью — то, что видно сейчас (обложка последнего поста
   или плашка) с подписью «Сейчас — обложка последнего поста» / «Сейчас — цветная плашка».
   Макета секции нет — устройство как у `AvatarForm`.
7. **Admin.** Карточка «Обложка» в левой колонке `office/admin/users/[id]` под «Аватар», только
   если обложка есть; форма — копия `UserAvatarRemoveForm`. Плашка «себя менять нельзя» — «Свои
   роли, блокировку, аватар и обложку здесь менять нельзя». Новые enum-значения
   (`cover_removed`, `user.cover_removed`) в SQLite — просто text без CHECK: миграции не требуют.
8. **Демо-обложки — отдельные файлы**, а не ключи фото постов: удаление обложки стирает файлы по
   ключу, и картинка поста пропала бы вместе с ней. `images.ts` режет выбранные фото из
   `photos.json` ещё раз под новым ключом.

## Шаги

### 1. Схема и миграция
- `src/database/schema.ts`, `users`, после `favoritesPublic`:
  ```ts
  // Своя обложка профиля (спека 41): webp по ширине, COVER_WIDTHS; better-auth колонку не знает, пишет uploadCoverAction
  coverKey: text('cover_key'),
  // «Ещё у Ани» под постом (спека 41): человек пишет сам, без склонения; пишет updateBioAction
  nameGenitive: text('name_genitive'),
  ```
  Третьим аргументом `sqliteTable` (у `users` его пока нет) —
  `t => [ check('users_name_genitive_check', sql\`${t.nameGenitive} IS NULL OR length(${t.nameGenitive}) BETWEEN 1 AND 40\`) ]`.
- В `USER_ADMIN_ACTIONS` — `'cover_removed'`, в `NOTIFICATION_TYPES` — `'user.cover_removed'`
  рядом с `user.avatar_removed`.
- `npx drizzle-kit generate --name profile_cover_name` → `drizzle/0023_profile_cover_name.sql`.
  Генератор пересоберёт `users` ради CHECK (`__new_users` + `DROP`) — на `users` ссылаются,
  `DROP` упадёт. Заменить SQL руками, снапшот оставить, как в `0021_post_lead.sql`:
  ```sql
  /*
    Написано руками вместо сгенерированного: drizzle-kit пересобирал users ради CHECK, а
    DROP TABLE users в транзакции миграции падает на внешних ключах (см. 0021_post_lead.sql).
    CHECK на колонке по смыслу равен табличному users_name_genitive_check из schema.ts
  */
  ALTER TABLE `users` ADD `cover_key` text;--> statement-breakpoint
  ALTER TABLE `users` ADD `name_genitive` text CONSTRAINT "users_name_genitive_check" CHECK("name_genitive" IS NULL OR length("name_genitive") BETWEEN 1 AND 40);
  ```
  (`--> statement-breakpoint` — как в других многострочных миграциях `drizzle/`, проверить формат.)
- Прогон на копии: `cp storage/dev.db storage/dev.db.bak-41`, `npm run db:migrate` (migrator
  показывает ошибку, `drizzle-kit migrate` молча откатывается), MCP `sql-dev` → `schema` users,
  затем `touch next.config.ts`.

### 2. Картинки — `core/imageUrl.ts`, `shared/images.ts`
- `core/imageUrl.ts`: `export const COVER_WIDTHS = [ 1600, 800 ] as const;`, комментарий над
  константами дополнить («… и ширины обложки профиля»). `ImageSize` не меняется (размеры уже в
  `IMAGE_WIDTHS`).
- `shared/images.ts`, после `saveImageVariants`:
  ```ts
  /*
    Варианты по ширине — для обложки профиля (спека 41): баннер широкий, портретное фото
    по длинной стороне вышло бы узким. Кадрирует CSS
  */
  export async function saveWidthVariants(buffer: Buffer, widths: readonly number[]){ … }
  ```
  Тело — как у `saveImageVariants` (rotate, try/catch с `removeUploads`), resize
  `{ width: size, withoutEnlargement: true }`, `webp({ quality: 82 })`. Возвращает `{ key }`.

### 3. dto — `domains/users/dto/authRequests.ts`, `userAdminRequests.ts`
- `avatarUploadDto` → переименовать в `imageUploadDto` (то же тело), использовать для аватара и
  обложки. Поправить импорт в `userAccountActions.ts` (других потребителей проверить grep).
- `userBioDto` дополнить:
  ```ts
  // «Ещё у …» (спека 41): одно-два слова, до 40; пусто — null в action
  nameGenitive: z.string().trim().transform(v => v.replace(/\s+/g, ' '))
    .pipe(z.string().max(40, 'Не больше 40 символов').refine(v => v.split(' ').length <= 2, 'Одно или два слова'))
  ```
  Пустая строка проходит (`''.split(' ').length === 1`).
- `userAdminRequests.ts`: `userRemoveCoverDto` — копия `userRemoveAvatarDto` с комментарием про
  ключ обложки (или общий `userRemoveImageDto`, если читается проще — на усмотрение, но тогда
  переименовать и аватарный).

### 4. Actions пользователя — `domains/users/actions/userAccountActions.ts`
- `replaceAvatar` → `replaceImage(userId, column: 'avatarKey' | 'coverKey', key)`: транзакция
  читает старое значение колонки и пишет новое, `revalidatePath(\`/authors/${userId}\`)`.
  Комментарий над функцией обновить.
- `uploadCoverAction` — как `uploadAvatarAction`: `consumeOrFail(rateLimiters.imageUpload, …)`
  (общий лимит загрузок), `readImage`, `saveWidthVariants(read.buffer, COVER_WIDTHS)`,
  `replaceImage(user.id, 'coverKey', key)`, старые файлы — `removeUploads(old, COVER_WIDTHS)`.
  Ошибка чтения — `returnValidationErrors(imageUploadDto, { file: … })`. Возвращает `{ coverKey }`.
- `removeCoverAction` — как `removeAvatarAction`.
- `updateBioAction`:
  ```ts
  const nameGenitive = parsedInput.nameGenitive || null;
  const old = db.transaction(tx => { читает nameGenitive; пишет bio и nameGenitive; возвращает старое });
  revalidatePath(`/authors/${user.id}`);

  if(old !== nameGenitive){
    revalidatePath('/posts/[id]', 'page');
  }
  ```
  (решение 5). Комментарий в схеме у `bio` («пишет updateBioAction») остаётся верным.
- `/authors` — `force-dynamic`, отдельный revalidate не нужен.

### 5. Admin — `userAdminActions.ts`, `userAdminTransaction.ts`, подписи
- `userAdminTransaction.ts`: в select цели и в `AdminTarget` — `coverKey`.
- `removeUserCoverAction` — копия `removeUserAvatarAction`: сверка `target.coverKey` с
  `expected` (`staleError`), `set({ coverKey: null })`, запись `action: 'cover_removed'`,
  `comment || null`, `notify(tx, 'user.cover_removed', [ id ], { actorId: auth.id })`, после —
  `publishNotifications`, `removeUploads(expected, COVER_WIDTHS)`,
  `revalidatePath(\`/authors/${id}\`)`, `redirect`.
- `userAdminActionLabels.ts`: `cover_removed: 'Обложка удалена'`.
- `loadAdminUser.ts`, `ADMIN_TONES`: `cover_removed: 'coral'`. В «Журнал» `user.md` — дописать
  (шаг 10).
- Остальные `Record<UserAdminActionType, …>` и `Record<NotificationType, …>` найдёт `tsc`.

### 6. Уведомление — `domains/notifications/shared/`
- `notificationText.ts`: `case 'user.cover_removed': return fixed('Администратор удалил обложку вашего профиля', '/office/profile');`
- `notificationLook.ts`: `'user.cover_removed': { icon: IconAlertCircle, tone: 'coral', title: 'Обложка удалена', action: 'Профиль' }`.

### 7. Обложка на публичных страницах
- `domains/users/shared/getAuthor.ts`: в `columns` — `coverKey: true, nameGenitive: true`.
- `domains/users/shared/authorCover.ts` (решение 3), без `server-only` (чистая функция):
  ```ts
  export type AuthorCover = { fileKey: string, width?: number, height?: number }

  // Своя обложка главнее обложки последнего поста (спека 41, п. 3); нет обеих — плашка
  export function authorCover(coverKey: string | null, postCover: AuthorCover | null | undefined): AuthorCover | null
  ```
- `AuthorHead.tsx` и `AuthorSpotlight.tsx`: тип пропа `cover` — `AuthorCover | null`, комментарий
  к пропу: «своя обложка профиля или обложка последнего поста». `width`/`height` у `<img>`
  передаются как есть (для своей — `undefined`). srcset у `AuthorHead` уже 800/1600 — подходит.
- `app/(public)/authors/[id]/page.tsx`: запрос `last` — только при `!author.coverKey`
  (`author.coverKey ? [] : db.select(…)`), комментарий «Баннер — своя обложка или обложка
  последнего поста». `cover={authorCover(author.coverKey, banner?.cover)}`.
- `domains/users/shared/authorsDirectory.ts`: в select — `coverKey: users.coverKey`.
- `app/(public)/authors/page.tsx`: `lastPostCovers(spotlight.filter(a => !a.coverKey).map(a => a.id))`,
  `cover={authorCover(author.coverKey, covers.get(author.id))}`.
- Проверить grep, нет ли других мест с баннером автора (`ui-author-head__band`, `lastPostCovers`):
  на момент плана их два — выше.

### 8. Профиль в кабинете
- `domains/users/components/CoverForm.tsx` (`'use client'`, `client-only`) — устройство
  `AvatarForm`: проверка типа и размера на клиенте, `uploadCoverAction` / `removeCoverAction`,
  подтверждение удаления, `router.refresh()` по успеху. Пропы: `coverKey: string | null`,
  `fallback: AuthorCover | null` (обложка последнего поста), `tone` не нужен — плашку красить
  тем же `data-tone`, что и баннер: вынести `TONES` и выбор по `id % 4` в
  `domains/users/shared/authorTone.ts` и использовать в `AuthorHead`, `AuthorSpotlight`, `CoverForm`
  (тогда проп `authorId: number`).
  - Разметка: `div.ui-account-cover` > `div.ui-account-cover__band[data-tone]` с `<img>`
    (`imageUrl(key, 800)`), под ним ряд кнопок «Загрузить обложку» / «Заменить обложку»,
    «Удалить» → «Удалить обложку» + «Отмена», подсказка «jpeg, png или webp до 5 МБ — по краям
    обрежется, как на странице автора», под ней без своей — «Сейчас — обложка последнего поста» /
    «Сейчас — цветная плашка». Ошибки — как в `AvatarForm`.
- CSS (`theme/layout.css`, рядом с `.ui-account-avatar`, и строка в оглавлении наверху файла):
  `.ui-account-cover__band { height: 120px; border-radius: var(--radius-card, 16px); overflow: hidden; background: var(--paper-tint); }`,
  `img { width: 100%; height: 100%; object-fit: cover; display: block }`, тона — те же
  `--accent-soft` / `--sun-soft` / `--mint-soft` / `--plum-soft`, что у `.ui-author-head__band`
  (взять имя радиуса из соседних правил, не выдумывать токен). На телефоне — 96px.
- `app/office/profile/page.tsx`: в `columns` — `coverKey: true, nameGenitive: true`; fallback —
  `profile.coverKey ? null : (await lastPostCovers([ user.id ])).get(user.id) ?? null`
  (`lastPostCovers` из `domains/posts/shared` — `app/` импортирует напрямую). Секция после
  «Аватар»:
  `<ProfileSection title="Обложка" hint="Баннер на вашей странице автора и в карточке на странице авторов">`.
  `UserBioForm` получает `nameGenitive={profile?.nameGenitive ?? ''}`.
- `UserBioForm.tsx`: `useForm({ bio, nameGenitive })`, между «Имя» и «О себе»:
  ```tsx
  <TextInput
    label="Как вас называть в подписях: «Ещё у …»"
    placeholder="Ани, Марата Хасанова"
    description="Под вашими постами: «Ещё у Ани». Пусто — «Ещё у автора»"
    maxLength={40}
    {...nv('nameGenitive')}
    error={fieldError(action.result.validationErrors, 'nameGenitive')}
  />
  ```
  `inputWrapperOrder` — как у поля «Имя». Комментарий компонента дописать (спека 41).
- Подзаголовок `OfficeHead` не меняется.

### 9. «Ещё у …» — `app/(public)/posts/[id]/page.tsx`
- `<h2 className="ui-post-more__title">Ещё у { author.nameGenitive ?? 'автора' }</h2>`.

### 10. Админка — `app/office/admin/users/[id]/page.tsx`, `UserCoverRemoveForm.tsx`
- `domains/users/components/admin/UserCoverRemoveForm.tsx` — копия `UserAvatarRemoveForm`:
  вместо аватара — превью обложки (`imageUrl(coverKey, 800)`, 160×48, `object-fit: cover`,
  класс `.ui-user-cover__preview`), кнопка «Удалить обложку», `removeUserCoverAction`. Остальные
  классы — те же `ui-user-avatar*` (раскладка одинаковая); если превью ломает сетку
  `.ui-user-avatar` — добавить модификатор `.ui-user-avatar--cover` в CSS.
- В странице — карточка под «Аватар»:
  ```tsx
  { user.coverKey && <UserAdminCard title="Обложка" hint="Можно удалить, если нарушает правила — пользователь получит уведомление">
    <UserCoverRemoveForm key={user.coverKey} id={user.id} coverKey={user.coverKey} />
  </UserAdminCard> }
  ```
  `loadAdminUser` берёт всю строку `users` — `coverKey` там уже будет. Комментарий страницы и
  плашка «себя менять нельзя» — с обложкой (решение 7).

### 11. Демо — `scripts/seed-demo/`
- `people.ts`, `Person`: `nameGenitive: string` (обязательное — у всех, спека п. 7) и
  `cover?: SeedPhoto` (импорт типа из `./types.ts`; проверить, что нет циклического импорта
  значений — только `import type`). Родительный падеж:
  alice «Алисы», some «Семёна», bob «Бориса», dan «Данила», eva «Евы», petr «Петра Петровича»,
  anya «Ани», marat «Марата Хасанова», liza «Лизы», igor «Игоря», nina «Нины», timur «Тимура»,
  olga «Ольги», seva «Севы», katya «Кати», pavel «Павла», vera «Веры», gleb «Глеба», mila «Милы»,
  artem «Артёма».
- `cover` — у 4 авторов: два из тройки «Больше всего читателей» на `/authors` (по подписчикам —
  проверить после сида через `sql-dev`, кто в тройке) и два вне её, например `nina` и `timur`.
  Третий из тройки — без своей обложки, чтобы в карточках были видны оба случая. Фото — из
  `photos.json`, горизонтальные (ширина ≥ 1600 в исходнике), желательно не обложка их же
  последнего поста — иначе разницы не видно.
- `images.ts`:
  - `SeedImages.covers: Record<string, string>` (ключ человека → ключ загрузки);
  - в `buildSeedImages` после аватаров: для людей с `cover` — `cached(cacheDir, \`${set}-${index}.jpg\`, entry.url)`
    (тот же кэш, что у фото постов) и `saveWidth(uploadsDir, file)`;
  - `saveWidth` — как `saveWidthVariants` (решение 1), ширины `COVER_WIDTHS = [ 1600, 800 ]`
    локальной константой (скрипты не импортируют `@/`, как `IMAGE_WIDTHS` здесь же).
- `fill.ts`, `values` пользователей: `nameGenitive: person.nameGenitive`,
  `coverKey: files.covers?.[person.key] ?? null` (`?.` — старый manifest из `/app/seed-images`
  без `covers` не должен ронять сид).
- `Dockerfile` — `scripts/seed-demo/` уже копируется целиком (проверить), новых файлов нет.
- Прогнать `npm run db:seed-dev`, проверить через `sql-dev`: у всех 20 есть `name_genitive`, у 4 —
  `cover_key`, файлы `storage/uploads/<key>-1600.webp` и `-800.webp` есть.

### 12. Документы
- `docs/lifecycles/user.md`:
  - «Журнал» — в перечень действий «удалена обложка»;
  - «Публичная страница» — баннер: своя обложка, иначе обложка последнего поста, иначе плашка;
    в карточке `/authors` — так же;
  - «Уведомления» — `user.cover_removed` в перечне;
  - новый раздел «Обложка профиля» после «Аватар»: загружает и удаляет сам (jpeg/png/webp до
    5 МБ, по ширине 1600 / 800, кадр по центру), где видна, удаление чужой — `admin` на странице
    пользователя с журналом, причина необязательна, свою — обычной кнопкой профиля;
  - в «Публичная страница» или рядом — поле «Как вас называть в подписях» (`name_genitive`):
    сам человек, 1–2 слова до 40 символов, только «Ещё у …» под постом, без него — «Ещё у автора».
- `docs/specs/41-profile-cover-name.md`: статус — «реализовано, следующая фаза — проверка»;
  отклонения от плана — в конец.
- `docs/specs/30-redesign.md`, «Не сделано», строки 78 и 82 — дописать «→ сделано в 41».
- `docs/specs/README.md`: строка 41 — статус по итогам.
- `CLAUDE.md` — правок не нужно (новых правил проекта нет).

### 13. Проверки
- `npx tsc --noEmit`, `npm run lint`.
- Ручная проверка (фаза 4, скил `app-run`):
  1. `bob` в `office/profile`: секция «Обложка» с превью «Сейчас — …»; загрузить горизонтальное
     фото — превью обновилось, на `/authors/<bob>` баннер — своя картинка (в DevTools — `-1600`,
     на 390px — `-800`); загрузить портретное — баннер не размыт, кадр по центру.
  2. Файлы > 5 МБ и не картинка — ошибка под кнопкой; 6 загрузок подряд — лимит `imageUpload`.
  3. Удалить свою — баннер снова обложка последнего поста; у пользователя без постов — плашка;
     старые файлы обложки из `storage/uploads/` пропали.
  4. `/authors`: в тройке карточек своя обложка у тех, у кого есть, у остальных — обложка поста.
  5. Поле «Как вас называть…»: «Ани» → под постом bob «Ещё у Ани» (без перезагрузки dev-кэша —
     обычный переход на пост); три слова — ошибка; 41 символ — ошибка; «  Бориса  Беляева » →
     сохранилось «Бориса Беляева»; очистить — «Ещё у автора».
  6. `alice` на `office/admin/users/<bob>`: карточка «Обложка», удалить без причины — запись
     «Обложка удалена · Алиса Воронцова» в «Последних действиях», у `bob` — тост и уведомление
     «Администратор удалил обложку вашего профиля» → профиль; баннер — снова обложка поста.
  7. Две вкладки admin: bob меняет обложку между открытием и удалением — «Пользователь уже
     изменился — обновите страницу».
  8. `alice` на своей странице в админке — плашка без карточки «Обложка»; в своём профиле
     удаляет обложку обычной кнопкой.
  9. Тёмная и светлая тема: плашка и превью в профиле; телефон 390px — секция профиля.
- Напомнить про `/clear` перед реализацией.
