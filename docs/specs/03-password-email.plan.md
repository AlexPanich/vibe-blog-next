# 03. Пароль и email — план

Спека: [03-password-email.md](03-password-email.md). Порядок: очередь и лимиты →
better-auth → DTO и actions → UI → документы. Миграций нет.

## 1. Очередь

- `globals/queue.ts`: в `QUEUE_SCHEMA` — общая задача `'mail.send': { to, subject, text }`.
  Письмо верификации остаётся своей задачей (его зовёт better-auth, менять незачем).
- `queue-runner.ts`: второй `defineWorker('mail.send')` — печатает письмо в консоль, как
  первый. `shutdown` останавливает оба.
- Тексты писем собираются в `domains/users/shared/userMails.ts` — функции, которые
  возвращают `{ subject, text }`: сброс, «пароль изменён», «запрошена смена email». Файл
  без `server-only` не нужен — его зовут только сервер и `globals/auth.ts`.

## 2. Лимиты: `globals/rateLimiter.ts`

| ключ | points / duration | ключ счётчика | где |
|---|---|---|---|
| `passwordResetIp` | 20 / 1 ч | IP | цепочка `requestPasswordResetAction` |
| `passwordResetEmail` | 3 / 1 ч | email | внутри action, молча |
| `credentialCheck` | 5 / 60 с, block 5 мин | id пользователя | внутри action смены пароля и email, сброс при успехе |
| `verificationEmail` (есть) | 3 / 1 ч | новый email | смена email, после проверки пароля |

## 3. better-auth: `globals/auth.ts`

- `config/auth.ts` += `baseUrl` из `BETTER_AUTH_URL` (env читается только в `config/`).
- `emailAndPassword`:
  - `sendResetPassword({ user, token })` → `sendToQueue('mail.send', …)` со ссылкой
    `${baseUrl}/auth/reset-password?token=${token}` (не `url` better-auth — он ведёт на
    HTTP-эндпоинт вне whitelist);
  - `revokeSessionsOnPasswordReset: true`;
  - `onPasswordReset({ user })`: в одной транзакции удалить все `verifications` с
    `identifier LIKE 'reset-password:%' AND value = user.id`, поставить
    `emailVerified = true`; затем письмо «пароль изменён».
- `user.changeEmail: { enabled: true }` — без `sendChangeEmailConfirmation`: ветка
  `change-email-verification`, письмо на новый адрес идёт через уже настроенный
  `sendVerificationEmail`, после перехода `emailVerified = true`.

## 4. DTO: `domains/users/dto/authRequests.ts`

Пароль — общая схема `password = z.string().min(8).max(64)` (сейчас продублирована).

- `forgotPasswordDto` — `{ email }`;
- `resetPasswordDto` — `{ token, password, confirm }`, refine «Пароли не совпадают» на
  `confirm`;
- `changePasswordDto` — `{ current, password, confirm }`, тот же refine;
- `changeEmailDto` — `{ email, current }`.

## 5. Actions

`domains/users/actions/authActions.ts` (публичные потоки):

- `requestPasswordResetAction` — `actionClient`, `rateLimit(passwordResetIp, ip => ip)`.
  Внутри: `passwordResetEmail.consume(email)` в try/catch; если очко есть —
  `auth.api.requestPasswordReset({ body: { email } })`. Ответ всегда `{ sent: true }`.
- `resetPasswordAction` — `auth.api.resetPassword({ body: { token, newPassword } })`;
  `INVALID_TOKEN` → `actionError(410, 'Ссылка больше не работает…')`; успех —
  `{ done: true }`.

`domains/users/actions/userAccountActions.ts` (профиль, `actionAuthClient`):

- `changePasswordAction` — `consumeOrFail(credentialCheck, id)` →
  `auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions:
  true }, headers })`. `INVALID_PASSWORD` → ошибка поля `current`;
  `CREDENTIAL_ACCOUNT_NOT_FOUND` → `actionError(409, …)`. Успех: сброс `credentialCheck`,
  письмо «пароль изменён». Новую cookie сессии ставит `nextCookies()`.
- `changeEmailAction` — `consumeOrFail(credentialCheck, id)` → тот же адрес — ошибка
  поля `email` → `auth.api.verifyPassword({ body: { password }, headers })`, неверный —
  ошибка поля `current` → сброс `credentialCheck` → `consumeOrFail(verificationEmail,
  email)` → `auth.api.changeEmail({ body: { newEmail, callbackURL: '/office/profile' },
  headers })` → письмо «запрошена смена» на старый адрес. Ответ `{ sentTo: email }`.

## 6. UI

### Компоненты `domains/users/components/`

- `ForgotPasswordForm`, `ResetPasswordForm` (props: token), `PasswordChangeForm`,
  `EmailChangeForm` — client, `useForm` + Mantine, ошибки полей через `fieldError`,
  серверные — `Alert`. Успех заменяет форму блоком (forgot, reset) или очищает поля
  (профиль: `key` по счётчику успешных отправок).
- `LoginForm` — ссылка «Забыли пароль?».
- `shared/findResetToken.ts` (server-only) — живая запись `reset-password:<token>` в
  `verifications` (`expiresAt > now`), не потребляя её.

### Страницы

- `app/(public)/auth/forgot-password/page.tsx`.
- `app/(public)/auth/reset-password/page.tsx` — `searchParams.token`: нет → «ссылка
  неполная»; `findResetToken` пусто → «ссылка больше не работает»; иначе форма.
- `app/office/profile/page.tsx` — панели «Пароль» и «Email». Есть ли пароль — запись в
  `accounts` с `providerId = 'credential'` и непустым `password`.

## 7. Документы

- `docs/lifecycles/user.md` — раздел «Учётные данные»: восстановление, смена пароля и
  email, что гасит сессии, письма.
- `CLAUDE.md`, Auth — ссылка сброса собирается сами, HTTP-эндпоинт не открыт; общая
  задача очереди `mail.send`.
- Спека → `done`, отклонения — в спеку.

## 8. Проверка

Письма worker печатает в консоль, но задачи лежат в `storage/data.db` — скрипт проверки
берёт ссылки оттуда (или токен сброса из `verifications`).

- `npx tsc --noEmit`, `npm run lint`.
- Через `app-run`, на `bob`:
  1. «Забыли пароль?» с несуществующим и существующим email — одинаковый ответ; письмо
     в очереди только для существующего.
  2. Два запроса подряд → по второй ссылке пароль меняется → первая ссылка «больше не
     работает» (и при открытии, и при отправке).
  3. После сброса: активная сессия bob вылетела, вход со старым паролем — ошибка, с
     новым — проходит; письмо «пароль изменён» в очереди.
  4. Неподтверждённый пользователь (временный, создать регистрацией): сброс → входит.
  5. Профиль: смена пароля с неверным текущим — ошибка поля; с верным — успех, текущая
     сессия жива, вторая сессия bob вылетела.
  6. Смена email: неверный пароль — ошибка; верный — письмо на новый адрес и
     уведомление на старый в очереди; по ссылке адрес сменился, вход с новым email.
  7. Лимит: 6 неверных текущих паролей подряд → 429.
- В конце вернуть bob пароль `password123` и email `bob@example.com`.
