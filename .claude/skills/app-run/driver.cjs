/**
 * Минимальный браузерный драйвер для приложения. Умеет только две вещи:
 * запустить системный Chrome (без скачанного браузера Playwright) и войти в аккаунт.
 * Всё остальное (навигация, формы, перехват сети, проверки) пишется в одноразовом
 * скрипте в scratchpad/tmp, который подключает этот файл по абсолютному пути.
 *
 * `require('playwright')` резолвится из node_modules проекта, потому что файл
 * лежит внутри репозитория — NODE_PATH не нужен.
 *
 * Всё, что зависит от проекта, приходит через env (значения — в CLAUDE.md проекта):
 *   BASE_URL          адрес приложения, по умолчанию http://localhost:3000
 *   LOGIN_PATH        страница с формой входа
 *   AFTER_LOGIN_PATH  префикс пути, куда редиректит после успешного входа
 *   E2E_EMAIL / E2E_PASSWORD  тестовая учётка
 *
 *   const { launch, login } = require('<abs>/.claude/skills/app-run/driver.cjs');
 *   const { browser, context, page } = await launch();
 *   await login(page);
 *   // ... шаги задачи ...
 *   await browser.close();
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

/** Запускает системный Chrome. `headless: false` — чтобы смотреть глазами. */
async function launch({ headless = true } = {}) {
  const browser = await chromium.launch({ channel: 'chrome', headless });
  const context = await browser.newContext({ baseURL: BASE });
  const page = await context.newPage();
  return { browser, context, page };
}

/**
 * Входит через настоящую форму (поля name="email" / name="password", submit-кнопка
 * в форме) и ждёт редиректа на afterLoginPath.
 */
async function login(page, {
  email = process.env.E2E_EMAIL,
  password = process.env.E2E_PASSWORD,
  loginPath = process.env.LOGIN_PATH,
  afterLoginPath = process.env.AFTER_LOGIN_PATH
} = {}) {
  if(!email || !password || !loginPath || !afterLoginPath){
    throw new Error('login: задайте E2E_EMAIL, E2E_PASSWORD, LOGIN_PATH, AFTER_LOGIN_PATH (env или аргументом)');
  }

  await page.goto(loginPath, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // До гидрации ввод в контролируемые поля теряется, а submit уходит нативной формой
  await page.waitForLoadState('networkidle', { timeout: 60000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname.startsWith(afterLoginPath), { timeout: 30000 });
  return page;
}

module.exports = { chromium, launch, login, BASE };
