---
name: rate-limit
description: Rate limiting запросов и server actions через rate-limiter-flexible и обёртки проекта (rateLimitRequest для proxy, rateLimit middleware для next-safe-action). Использовать всегда, когда нужно ограничить частоту запросов или вызовов action (вход, регистрация, сброс пароля, отправка писем, формы, API), когда добавляется или меняется limiter, когда обсуждается защита от brute force, перебора или спама.
---

# Rate limit: proxy и server actions

Лимиты работают на пакете `rate-limiter-flexible`. Напрямую его API в коде почти не нужен: для двух сценариев есть обёртки.

- **proxy** — глобальный лимит на каждый request: `rateLimitRequest` из `@/shared/rateLimitProxy`;
- **server action** — лимит на конкретное действие: middleware `rateLimit` из `@/shared/rateLimitAction`.

Это два разных файла, и они друг друга не импортируют. Action-часть тянет за собой action client, auth и db, а proxy это не нужно.

## Пакет rate-limiter-flexible — коротко

Limiter считает "очки" (points) по строковому ключу.

- `points` — сколько очков есть на окно;
- `duration` — длина окна в секундах;
- `blockDuration` — необязательно: на сколько секунд заблокировать ключ, когда очки кончились. Без него ключ просто ждёт конца окна;
- `keyPrefix` — namespace limiter-а. У каждого limiter-а свой, иначе счётчики смешаются.

`consume(key)` списывает очко и возвращает `RateLimiterRes` (`remainingPoints`, `msBeforeNext`). При превышении он **не возвращает, а бросает** `RateLimiterRes` — не `Error`. `delete(key)` сбрасывает счётчик ключа.

## Где объявляются limiter-ы

Все инстансы лежат в `@/globals/rateLimiter`, в объекте `rateLimiters`. Новый limiter — это новый ключ, созданный через `memoryLimiter()`, а не `new RateLimiterMemory()`:

```ts
export const rateLimiters = {
  // ...
  passwordReset: memoryLimiter({ keyPrefix: 'password-reset', points: 3, duration: 60 * 60 }),
};
```

`memoryLimiter()` кэширует каждый инстанс в `globalThis` по его настройкам, поэтому счётчики переживают HMR в dev. Новый ключ или изменённые числа подхватываются без рестарта. Целиком объект в `globalThis` **не** кэшируй: после HMR в нём не будет новых limiter-ов, и в action придёт `undefined` («Cannot read properties of undefined (reading 'consume')»). `RateLimiterMemory` живёт в памяти одного процесса: если в prod несколько инстансов приложения, лимиты фактически делятся на их число, и нужен общий store (Redis и т.п.).

Limiter передаётся в обёртки **по ссылке на инстанс** (`rateLimiters.passwordReset`), строковых имён нигде нет.

### `serverExternalPackages` в `next.config.ts`

`rate-limiter-flexible` должен оставаться в `serverExternalPackages`. Не убирай его оттуда.

Proxy и страницы с actions Next собирает в **разные бандлы**. Без этой настройки в каждый попадает своя копия пакета, а кэш limiter-ов в `globalThis` у них общий. Proxy срабатывает на каждом запросе первым, поэтому все limiter-ы создаются его копией. Action получает такой инстанс, и при превышении тот бросает `RateLimiterRes` из чужой копии. `instanceof RateLimiterRes` в обёртке даёт `false`, и вместо 429 клиент видит 500 «Something went wrong while executing the operation.».

Если пакет вынесен во внешние, Node загружает его один раз на процесс, и класс у всех один. То же правило действует для любого другого пакета, чьи объекты лежат в `globalThis` и проверяются через `instanceof` в разных бандлах.

## Сценарий 1: глобальный лимит в proxy

```ts
rateLimitRequest(request: Request, limiters: RateLimiterAbstract[]): Promise<NextResponse | null>
```

Списывает по очку у каждого limiter-а по IP клиента. Если все пропустили, возвращает `null`, иначе — готовый ответ `429 Too Many Requests` с заголовком `Retry-After`.

```ts
export async function proxy(request: NextRequest) {
  const limited = await rateLimitRequest(request, [ rateLimiters.globalSec, rateLimiters.globalMin ]);

  if(limited){
    return limited;
  }

  // ... остальная логика proxy
}
```

Для чего подходит: грубая защита от флуда — N запросов в секунду и в минуту с IP. Ключ здесь всегда IP, другого в proxy нет. Лимиты под конкретное действие сюда не ставь: proxy не знает, что за action вызывается и с какими данными.

## Сценарий 2: лимит в server action

```ts
rateLimit<Input>(limiter: RateLimiterAbstract, makeKey: (ip: string, input: Input) => string)
```

Возвращает middleware для `.useValidated()`, то есть ставится **после** `.inputSchema()`: `makeKey` получает уже провалидированный `parsedInput`, его тип выводится из схемы автоматически.

```ts
export const passwordResetAction = actionClient
  .inputSchema(passwordResetDto)
  .useValidated(rateLimit(rateLimiters.passwordReset, (ip, { email }) => `${ip}:${email}`))
  .action(async ({ parsedInput }) => {
    // ...
  });
```

Ключ, который зависит только от IP:

```ts
.useValidated(rateLimit(rateLimiters.commentCreate, ip => ip))
```

Несколько лимитов — несколько `.useValidated()` подряд. Каждая попытка списывает очко у всех, порядок важен только тем, кто бросит 429 первым:

```ts
export const loginAction = actionClient
  .inputSchema(loginDto)
  .useValidated(rateLimit(rateLimiters.loginIp, ip => ip))
  .useValidated(rateLimit(rateLimiters.loginAccount, (ip, { email }) => `${ip}:${email}`))
  .action(async ({ parsedInput, ctx: { rateLimits } }) => {
    // ...
  });
```

Работает и поверх `actionAuthClient`: `ctx.auth` остаётся на месте рядом с `ctx.rateLimits`.

### Превышение лимита

Middleware сам прерывает action и отдаёт клиенту `serverError` вида `{ code: 429, message }`, где в `message` уже написано, через сколько секунд повторить. В action ничего ловить не нужно. На клиенте:

```tsx
{ action.result.serverError && <Alert color="red">{ action.result.serverError.message }</Alert> }
```

`serverError` у всех action имеет тип `ActionServerError` (`{ code, message }`) из `@/globals/actionClient`. Свою ожидаемую ошибку из action отдавай через `actionError(code, message)` оттуда же, а не через голый `returnServerError` — у него тип не проверяется.

### `ctx.rateLimits`

Каждый `rateLimit` добавляет запись в `ctx.rateLimits`. Это не массив: индексов нет, есть только два метода.

- `find(limiter)` — запись конкретного limiter-а. Если его нет в цепочке, бросает исключение (это ошибка в коде, а не в данных).
- `forEach(fn)` — обход всех записей. В отличие от `Array.forEach` возвращает `Promise` и ждёт все результаты `fn`, поэтому его можно `await`-ить.

Запись: `{ limiter, result, reset }`, где `result` — `RateLimiterRes` (`remainingPoints` и т.п.), `reset()` — сбросить счётчик этого ключа.

```ts
const left = rateLimits.find(rateLimiters.loginAccount).result.remainingPoints;
```

### Сброс

Сбрасывать счётчики решает **только action**, в middleware такой настройки нет и не нужно.

```ts
.action(async ({ parsedInput, ctx: { rateLimits } }) => {
  await auth.login(parsedInput);
  await rateLimits.find(rateLimiters.loginAccount).reset();
})
```

Сбросить всё, что есть в цепочке:

```ts
await rateLimits.forEach(l => l.reset());
```

`forEach` удобен, только когда **все** limiter-ы в цепочке можно сбрасывать. Обычно это не так — см. ниже.

### Списание внутри action

Middleware списывает очко **до** тела action. Если очко можно тратить только после проверки (пароля, владения и т.п.), списывай его внутри action через `consumeOrFail(limiter, key)` из `@/shared/rateLimitAction`. Превышение прерывает action тем же `serverError` 429, что и middleware. В `ctx.rateLimits` такой limiter не попадает.

```ts
await consumeOrFail(rateLimiters.verificationEmail, parsedInput.email);
```

Пример — повторное письмо верификации в `resendVerificationAction`. Лимит по email в цепочке позволил бы любому без пароля выжечь квоту чужого ящика.

## Проверка логики лимитов

Когда человек просит поставить или поменять лимиты, не ставь их механически. Подумай, логичны ли они, реалистичны ли числа и удобно ли это живым пользователям. Если что-то не так, скажи об этом и обсуди с человеком до того, как писать код.

На что смотреть:

- **Обход через смену части ключа.** Если ключ `ip:email`, атакующий меняет email и перебирает один популярный пароль по многим аккаунтам. Рядом нужен лимит без этой части (по одному IP), с большим числом очков.
- **Нормализация ключа.** Ключ строится из нормализованного значения. Иначе `Alice@x.com` и `alice@x.com` — разные счётчики, и лимит по аккаунту обходится сменой регистра. Лучше нормализовать в zod-схеме, тогда `parsedInput` уже чистый.
- **Что сбрасывать при успехе.** Сброс уместен для лимита перебора по конкретной учётке: успешный вход доказывает знание пароля. Лимит по IP и лимиты "N действий в час" (регистрация, письма) не сбрасываются: иначе атакующий обнуляет счётчик входом в свой аккаунт, а лимит "в час" перестаёт что-либо ограничивать.
- **NAT и живые люди.** За одним IP бывает офис, общежитие, мобильный оператор. Лимит по IP должен быть заметно выше лимита по учётке и не блокировать нормальную работу группы людей.
- **Реалистичность чисел.** Сколько раз нормальный человек делает это действие за окно? Лимит должен быть выше с запасом, а `blockDuration` — не превращать опечатку в получасовую блокировку.
- **Место.** Флуд вообще — proxy. Конкретное действие с данными — action.

Достоверность IP **не обсуждай**: что приходит в `x-forwarded-for`, сколько прокси доверять и что на dev все клиенты в одном bucket — это настройка окружения (reverse proxy, `TRUSTED_PROXY_HOPS`), а не вопрос лимитов. Считай IP корректным.
