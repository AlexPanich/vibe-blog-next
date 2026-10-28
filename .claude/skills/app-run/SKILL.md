---
name: app-run
description: Запуск приложения в настоящем браузере. Загружать, когда нужно проверить изменение end-to-end (вход, формы, server actions, навигация, редиректы), воспроизвести баг в UI или снять скриншот. Поднимает системный Chrome через маленький Playwright-драйвер и входит в аккаунт; шаги конкретной задачи пишутся в одноразовом скрипте в scratchpad.
---

# Запуск приложения в браузере

Гоняем живое приложение в headless Chrome и смотрим на поведение — это не тесты.
Подходит для проверки входа, форм и server actions, воспроизведения багов UI и скриншотов.

## Что взять из проекта

Всё, что зависит от проекта, описано в его `CLAUDE.md` (раздел про запуск в браузере):

- адрес приложения (`BASE_URL`, по умолчанию `http://localhost:3000`);
- страница входа (`LOGIN_PATH`) и куда редиректит после входа (`AFTER_LOGIN_PATH`);
- тестовая учётка (`E2E_EMAIL` / `E2E_PASSWORD`);
- rate limit на вход и на запросы, если есть;
- путь к системному Chrome, если он нестандартный.

Если в `CLAUDE.md` этого нет — спроси у человека и допиши туда, а не в этот скил.

## Где работает приложение

Next.js: страницы, server actions и API (`/api/...`) — на одном origin. CORS не участвует.

Перед запуском проверить, что dev-сервер поднят:

```bash
curl -sf -o /dev/null "$BASE_URL$LOGIN_PATH" && echo up
```

Если не поднят — самому не запускать: попросить пользователя поднять dev-сервер
и продолжить, когда он подтвердит.

## Подготовка (один раз)

Проверить, что Playwright установлен:

```bash
node -e "require.resolve('playwright')" && echo ok
```

Если нет — самому не ставить: попросить пользователя выполнить команду ниже и
продолжить, когда он подтвердит.

Playwright ставится dev-зависимостью **без** скачивания браузера — используем
системный Chrome через `channel: 'chrome'`:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i -D playwright
```

`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` — Chrome уже есть, ~150 МБ качать незачем.

## Драйвер

`driver.cjs` рядом с этим файлом нарочно минимальный:

- `launch({ headless })` → `{ browser, context, page }`. Контекст создаётся с `baseURL`,
  поэтому `page.goto('/...')` работает с относительными путями.
- `login(page, { email, password, loginPath, afterLoginPath })` → входит через форму и
  возвращается, когда страница ушла на `afterLoginPath`. Все параметры по умолчанию
  берутся из env. Форма должна иметь поля `name="email"` / `name="password"` и
  submit-кнопку; если в проекте иначе — поправь драйвер.

Всё, что относится к конкретной задаче, в драйвер **не добавлять**. Писать в одноразовом
скрипте в scratchpad, который подключает драйвер по абсолютному пути (`playwright`
резолвится из `node_modules` проекта, `NODE_PATH` не нужен).

## Как пользоваться — скрипт в scratchpad

```js
// <scratchpad>/task.cjs
const path = require('path');
const { launch, login } = require('<repo>/.claude/skills/app-run/driver.cjs');

(async () => {
  const { browser, context, page } = await launch();

  // ошибки в консоли браузера и упавшие ответы — сразу видно, что сломалось
  page.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text()));
  page.on('response', (r) => r.status() >= 400 && console.log(r.request().method(), r.url(), '->', r.status()));

  await login(page);

  // ---- шаги задачи ----
  await page.goto('/some/page', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading').first().waitFor();
  // ... заполнить, нажать, проверить ...
  await page.screenshot({ path: path.join(__dirname, 'task.png'), fullPage: true });

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
```

Запуск (значения env — из `CLAUDE.md`, скриншоты — в scratchpad, не в репозиторий):

```bash
E2E_EMAIL=… E2E_PASSWORD=… LOGIN_PATH=… AFTER_LOGIN_PATH=… node <scratchpad>/task.cjs
```

Потом **обязательно посмотреть скриншот** (Read). Пустой кадр значит, что страница
не отрисовалась, а не что всё прошло.

## Подводные камни

- **Только системный Chrome.** `chromium.launch({ channel: 'chrome' })` — браузер
  Playwright не скачан.
- **Локаторы.** Сначала `getByRole` / `getByLabel` / `getByText`. Если `<label>` не связан
  с полем (нет `htmlFor` / вложенности), `getByLabel` ничего не найдёт — тогда искать
  по атрибуту: `locator('input[name="..."]')`.
- **Контролируемые инпуты:** только `fill` / `type` / `pressSequentially` — они проходят
  через `onChange` React. Присваивание `el.value = …` состояние не обновит.
- **Сначала гидрация, потом ввод.** После `goto` на страницу с формой —
  `await page.waitForLoadState('networkidle')`. Если заполнить поля до гидрации, React
  их перезапишет или склеит ввод со старым значением, а submit уйдёт нативной формой
  мимо server action. `login()` в драйвере это уже делает.
- **Git Bash на Windows** переписывает env, похожие на пути: `LOGIN_PATH=/auth/login`
  превращается в `C:/Program Files/Git/auth/login`. Запускать скрипт из PowerShell
  (`$env:LOGIN_PATH='/auth/login'; node …`) или с `MSYS_NO_PATHCONV=1`.
- **Server actions** ходят POST-запросом на текущий URL страницы с заголовком
  `Next-Action`. Чтобы поймать ответ:
  `page.waitForResponse((r) => r.request().method() === 'POST' && !!r.request().headers()['next-action'])`.
  Редирект из action — это клиентская навигация: ждать `page.waitForURL(...)`.
- **Сессия в httpOnly-куке.** Разлогинить — `context.clearCookies()`: через
  `document.cookie` такую куку не убрать.
- **Rate limit.** Если в проекте он есть, не крутить `login` в цикле: войти один раз и
  переиспользовать контекст. Нужно несколько сценариев — `context.storageState({ path })`
  после входа и `browser.newContext({ storageState })`. Ответ `429` — признак лимита,
  а не бага.
- **Медленный первый рендер.** `next dev` компилирует маршрут при первом заходе, первый
  `goto` может занять 10+ секунд. Ждать элемент через `waitFor`, а не `sleep`.
- **Ловушка подстроки в URL.** `/admin/items/new` содержит `/items` — проверять
  `new URL(page.url()).pathname === '/items'`, а не `.includes('/items')`.
