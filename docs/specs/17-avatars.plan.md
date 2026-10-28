# 17. Аватары — план

Спека: [17-avatars.md](17-avatars.md). Делается после 16: хранилище, обработка и раздача
файлов уже есть.

## 1. Схема (`0012_avatars`)

- `users.avatar_key text` — `ADD COLUMN` (на `users` ссылаются все — пересборки быть не
  должно, SQL проверить).
- `USER_ADMIN_ACTIONS` += `avatar_removed`; CHECK-и `user_admin_actions` его пропускают
  (роль — только у `role_*`, комментарий обязателен только у `banned`) — проверить в SQL.
- `globals/auth.ts`: `additionalFields.avatarKey { type: 'string', required: false,
  input: false }`; `AuthUser` += `avatarKey`; `shared/auth.ts` и
  `ClientSideInitializer` — пробросить.

## 2. Домен `users`

- `dto/authRequests.ts`: `avatarUploadDto { file: z.instanceof(File) }`;
  `userAdminRequests` — `removeAvatarDto { comment?: trim ≤ 500 }`.
- `actions/userAccountActions.ts`: `uploadAvatarAction` (`consumeOrFail(imageUpload)`,
  `readImage` → `saveSquareVariants([256, 64])` → `UPDATE users SET avatar_key` →
  удалить файлы старого ключа), `removeAvatarAction` (свой).
- `actions/userAdminActions.ts`: `removeUserAvatarAction(userId)` — через
  `adminTransaction` (актор всё ещё admin, не сам себе — `manageUser`), обнулить, журнал
  `avatar_removed`, после — файлы; нет аватара → 409 «Аватара уже нет».
- `shared/userAdminActionLabels.ts` — «Аватар удалён».
- `UserAvatar`: `avatarKey?: string | null` → `<img src={imageUrl(key, size > 64 ? 256 : 64)}
  alt="">` в том же круге, иначе буква; `alt=""` — имя всегда рядом текстом.
- `AvatarForm` (client) в `office/profile`: превью 96, «Загрузить» (проверка размера и
  типа на клиенте), «Удалить» с подтверждением; после успеха — `router.refresh()`, чтобы
  шапка взяла новый ключ из сессии.
- Ресурсы: `authorResource`, `authorCardResource` += `avatarKey`.

## 3. Где показывать

- `authors/[id]` — 96; `AuthorCard` — 48; `UserBox` в шапке — 28; комментарии — 28
  (`commentResource` += `authorAvatarKey`, `loadComments` — join `users.avatar_key`);
  `office/admin/users` (строка) — 32, `[id]` — 72 + кнопка «Удалить аватар» с полем причины.
- `exports/` users: `UserAvatar` — нужен домену `comments`.

## 4. Документы

- `user.md` — аватар: кто меняет, admin удаляет с записью в журнал.
- Спека → `done`, отклонения, `README.md`.

## 5. Проверка (`e2e/avatars.cjs`)

- `bob`: загрузка png 1200×800 → квадрат 256 и 64 на диске, в шапке аватар после
  загрузки без перелогина; замена — старые файлы удалены; 6 МБ / gif — ошибка.
- Аватар виден: страница автора, карточка на `/authors`, комментарий, админка.
- `alice`: удалить аватар bob — журнал «Аватар удалён», файлы удалены, у bob снова буква;
  своя страница в админке — кнопки нет; повтор с устаревшей страницы — 409.
- `bob` удаляет свой; консоль без ошибок; подчистка.
