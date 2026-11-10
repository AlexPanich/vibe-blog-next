# 48. Заявка в авторы: ссылка на тексты — план

Спека — `48-author-request-links.md` (решения 1–6). Одна миграция (`0032`, руками через
`ADD COLUMN`), lifecycle `user.md` — одна фраза. Образцы: миграция — `0028_ban_duration.sql`
(CHECK на колонке, шаг 1 плана 46); внешняя ссылка — `PostTypeMeta.tsx`; ошибка поля из
`transform` — без образца в проекте, код ниже.

## Решения плана (в спеке не было или уточнено)

1. **Когда считать, что схема есть.** Строка начинается с `[a-z][a-z0-9+.-]*:`, и после
   двоеточия **не цифра**: `javascript:…`, `mailto:…`, `ftp://…` — схема (дальше отказ),
   `example.com:8080/x` — порт, схемы нет, дописываем `https://`. Иначе адрес с портом без
   схемы попал бы в «схему `example.com:`» и получил бы непонятный отказ.
2. **Порядок проверок** (всё в одном `transform` zod): `trim` → пусто → `null` → есть пробел
   внутри (`/\s/`) → ошибка → дописать `https://` → `new URL` бросил → ошибка → `protocol` не
   `http:`/`https:` → ошибка → в `hostname` нет точки (или она первая/последняя) → ошибка →
   длина > 300 → «Не больше 300 символов». Все ошибки формата — один текст из спеки.
3. **Храним строку пользователя со схемой, а не `url.href`.** `href` переводит кириллический
   домен в punycode (`пример.рф` → `xn--…`) и дописывает `/` — в карточке был бы мусор.
   `new URL` только проверяет. Регистр и путь не трогаем.
4. **Хелперы — один файл без `server-only`**: `domains/users/shared/authorRequestLink.ts`
   (`normalizeAuthorRequestLink`, `authorRequestLinkLabel`). Нужны и dto (сервер), и
   компоненту ссылки (серверный, но чистая функция) — других доменов не касается, наружу не
   отдаём.
5. **Один компонент `AuthorRequestLink`** на все три места (серверный, без `'use client'`):
   строка «Где почитать: t.me/hiker». В карточке админа — внутри `.ui-request-review__quote`
   после текста, у заявителя — после `.ui-request-card__text` и после
   `.ui-request-item__text`. Нет `link` — компонент возвращает `null`.
6. **Телефон.** В истории заявок `.ui-request-item__text` на телефоне скрыт (спека 42) —
   по спеке («видна везде, где виден текст») ссылка в истории на телефоне тоже скрыта: в
   медиазапрос рядом с `.ui-request-item__text` добавить `.ui-request-item .ui-request-link`.
   В карточке «Ваша заявка» и у админа текст виден — ссылка тоже.
7. **`maxLength={300}` на поле** ограничивает ввод без схемы; после дописывания `https://`
   строка может стать 301–308 — тогда серверная ошибка «Не больше 300 символов». Редкий случай,
   отдельно не обрабатываем.
8. **Карточка пользователя в админке** (`loadAdminUser`, история заявок там без текста) —
   ссылку не показываем, спека её не упоминает.

## Шаги

### 1. Схема и миграция
- `src/database/schema.ts`, `authorRequests` после `text`:
  ```ts
  // «Где почитать ваши тексты» (спека 48): нормализованная, со схемой http(s); null — не указана
  link: text('link'),
  ```
  в третий аргумент — `check('author_requests_link', sql\`${t.link} IS NULL OR length(${t.link}) <= 300\`)`.
- `npx drizzle-kit generate --name author_request_link` → снапшот в `drizzle/meta`.
  Сгенерированный SQL (будет пересборка `__new_author_requests`) **заменить** руками:
  ```sql
  ALTER TABLE `author_requests` ADD `link` text CONSTRAINT "author_requests_link" CHECK(`link` IS NULL OR length(`link`) <= 300);
  ```
- Прогон на копии `storage/dev.db` через `npm run db:migrate` (migrator показывает ошибку),
  потом на dev. Если dev-сервер не видит колонку — `touch next.config.ts`.

### 2. Хелперы — `src/domains/users/shared/authorRequestLink.ts`
```ts
export const AUTHOR_REQUEST_LINK_MAX = 300;

export const AUTHOR_REQUEST_LINK_ERROR = 'Укажите ссылку на сайт, например t.me/name';

// Результат: null — поле пустое; { error } — текст ошибки поля; { link } — что хранить
export function normalizeAuthorRequestLink(value: string): { link: string | null } | { error: string }

// https://www.t.me/hiker/ → t.me/hiker: без схемы, www. и завершающего /
export function authorRequestLinkLabel(link: string): string
```
Логика `normalize` — реш. 1–3. Схема — `/^[a-z][a-z0-9+.-]*:(?!\d)/i`. Хост —
`url.hostname.includes('.') && !hostname.startsWith('.') && !hostname.endsWith('.')`.
`label` — `link.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')`.
Функции — exported сверху, внутренние помощники (если будут) — ниже (codestyle).

### 3. DTO — `domains/users/dto/authorRequestRequests.ts`
В `authorRequestDto`:
```ts
link: z.string().optional().transform((value, ctx) => {
  const result = normalizeAuthorRequestLink(value ?? '');

  if('error' in result){
    ctx.issues.push({ code: 'custom', message: result.error, input: value });

    return z.NEVER;
  }

  return result.link;
}),
```
Issue без `path` внутри `z.object` попадает на поле `link` — `fieldError(…, 'link')` его
увидит; если `validationErrors` окажутся на корне — проверить в браузере (шаг проверки 3) и
добавить `path: []`/явный путь. `AuthorRequestDto` (output) получает `link: string | null`.

### 4. Action — `authorRequestActions.ts`
`createAuthorRequestAction`: `values({ userId: auth.id, text: parsedInput.text, link: parsedInput.link })`.
Больше ничего: отзыв удаляет строку целиком, правки нет (реш. 6 спеки).

### 5. Загрузка для админа — `loadAdminAuthorRequests.ts`
В `selectRequests` — `link: authorRequests.link`, в `toRequest` — `link: row.link`.
`AdminAuthorRequest` подхватит тип сам. `AuthorRequestDecidedList` не трогаем (спека, п. 2.4).
Страница заявителя берёт строки через `db.query.authorRequests` / `authorRequestState` —
`link` приходит без правок (тип `AuthorRequest` выводится из схемы).

### 6. Компонент — `domains/users/components/authorRequest/AuthorRequestLink.tsx`
```tsx
type AuthorRequestLinkProps = { link: string | null }

// «Где почитать» в заявке (спека 48): одна строка, длинный адрес — многоточием, полный — в title
export default function AuthorRequestLink({ link }: AuthorRequestLinkProps) {
  if(!link){
    return null;
  }

  return (
    <p className="ui-request-link">
      <span className="ui-request-link__label">Где почитать:</span>
      <a href={link} target="_blank" rel="nofollow noopener ugc" title={link}>{ authorRequestLinkLabel(link) }</a>
    </p>
  );
}
```
Обычный `<a>`, не `Link` (внешний адрес).

Подключить:
- `AuthorRequestCard.tsx` — в `.ui-request-review__quote` после `<p className="ui-request-review__text">`: `<AuthorRequestLink link={request.link} />`.
- `app/office/author-request/page.tsx` — в «Ваша заявка» после `.ui-request-card__text`: `<AuthorRequestLink link={pending.link} />`.
- `AuthorRequestHistory.tsx` — после `.ui-request-item__text`: `<AuthorRequestLink link={request.link} />`.
- Комментарии-шапки этих компонентов дополнить словами «и ссылка «Где почитать» (спека 48)».

### 7. CSS — `src/theme/layout.css`, рядом с `.ui-request-review__*`
```css
/* «Где почитать» в заявке (спека 48): подпись и ссылка в одну строку, адрес — многоточием */
.ui-request-link {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  min-width: 0;
  margin: 0;
  font-size: 0.875rem;
  color: var(--ink-faint);
}

.ui-request-link__label {
  flex: none;
}

.ui-request-link a {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--link);
  text-decoration: none;
}

.ui-request-link a:hover {
  text-decoration: underline;
}
```
В телефонном медиазапросе, в правило с `.ui-request-item__text { display: none }`, добавить
селектор `.ui-request-item .ui-request-link` (реш. 6). Цвета — только токены.

### 8. Форма — `AuthorRequestForm.tsx`
- `useForm({ text: '', link: '' })`.
- После `Textarea`:
  ```tsx
  <TextInput
    label={<span className="ui-account-count">Где почитать ваши тексты <small>необязательно</small></span>}
    labelProps={{ className: 'ui-account-count__label' }}
    placeholder="t.me/name или ссылка на блог"
    radius={14}
    maxLength={AUTHOR_REQUEST_LINK_MAX}
    {...form.nv('link')}
    onChange={e => form.update('link', e.target.value)}
    error={fieldError(action.result.validationErrors, 'link')}
  />
  ```
  Готового приёма для пометки «необязательно» в проекте нет (в формах бана и аватара она в
  placeholder). Делаем как счётчик у textarea: `label={<span className="ui-account-count">Где
  почитать ваши тексты <small>необязательно</small></span>}` и
  `labelProps={{ className: 'ui-account-count__label' }}` — класс `ui-optional` не заводим.
- Убрать из шапки комментария «Поле … — спека 48», написать, что поле есть.

### 9. Демо — `scripts/seed-demo/fill.ts`
В строках `authorRequests` (≈ стр. 478–484): у Евы `link: 'https://eva-hikes.example.org'`, у
Глеба — `link: 'https://gleb-bike.example.com/routes'` (длинный путь — чтобы видеть
сокращение без схемы). У Кати и Артёма — без `link`. `seed-dev.ts` уже чистит
`authorRequests` — правок нет.

### 10. Lifecycle и спеки
- `docs/lifecycles/user.md`, раздел «Заявка на роль автора», первый абзац: после «…30–1000
  символов» — «, и необязательная ссылка «Где почитать ваши тексты» (одна, http(s), до 300
  символов; видят заявитель и admin)». Плюс фраза: «Ссылку, как и текст, не правят — отозвать
  и подать заново».
- После реализации: спека 48 — статус «реализовано, следующая фаза — проверка», README —
  строка 48 (`реализовано`). После проверки — `done`.

## Проверка

- `npx tsc --noEmit`, `npm run lint`.
- `mcp sql-dev` → `schema`: в `author_requests` колонка `link` с CHECK.
- Нормализация (временный скрипт в scratchpad, `node --experimental-strip-types` на
  `authorRequestLink.ts`, или в браузере):
  - `''`, `'   '` → `null`;
  - `t.me/hiker` → `https://t.me/hiker`; `HTTP://Example.com` → как есть (схема есть);
  - `example.com:8080/x` → `https://example.com:8080/x`;
  - `пример.рф/блог` → `https://пример.рф/блог` (без punycode);
  - `javascript:alert(1)`, `mailto:a@b.ru`, `ftp://x.ru`, `t.me /hiker`, `localhost`, `hiker`,
    `.ru`, `https://` → ошибка формата;
  - 295 символов без схемы → ошибка «Не больше 300 символов»;
  - label: `https://www.t.me/hiker/` → `t.me/hiker`.
- Браузер (скил `app-run`):
  1. `alice@example.com` (admin) → «Заявки в авторы»: у Евы и Глеба под текстом «Где почитать:»
     и ссылка, у Кати строки нет; в «Рассмотренных» ссылок нет. Ссылка открывается в новой
     вкладке, у `<a>` `rel="nofollow noopener ugc"`, `title` — полный адрес.
  2. Узкая карточка (телефонная ширина): длинный адрес Глеба обрезан многоточием, горизонтальной
     прокрутки нет.
  3. Пользователь без роли автора и без заявки (например, новый из регистрации или
     `seed-demo/people.ts`) → `office/author-request`: ввести `javascript:alert(1)` — ошибка под
     полем «Укажите ссылку на сайт…»; ввести `t.me/hiker` — заявка подана, в «Ваша заявка» —
     «Где почитать: t.me/hiker»; `sql-dev`: `link = 'https://t.me/hiker'`.
  4. Отозвать, подать без ссылки — строки «Где почитать» нет, `link IS NULL`.
  5. Admin отклоняет заявку со ссылкой → у заявителя в «Рассмотренных» ссылка есть на
     десктопе и скрыта на телефоне (вместе с текстом).
- После проверки вернуть демо: `npm run db:seed-dev`.
- Отклонения — в конец спеки.
