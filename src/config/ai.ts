import 'server-only';

const provider = process.env.AI_PROVIDER || 'local';

if(provider !== 'local' && provider !== 'anthropic'){
  throw new Error(`AI_PROVIDER: ожидается local или anthropic, а не «${provider}»`);
}

const moderationEffort = process.env.AI_MODERATION_EFFORT ?? 'low';

if(moderationEffort !== '' && !isEffort(moderationEffort)){
  throw new Error(`AI_MODERATION_EFFORT: ожидается low, medium, high, xhigh, max или пустое значение, а не «${moderationEffort}»`);
}

const authorEffort = process.env.AI_AUTHOR_EFFORT ?? 'low';

if(authorEffort !== '' && !isEffort(authorEffort)){
  throw new Error(`AI_AUTHOR_EFFORT: ожидается low, medium, high, xhigh, max или пустое значение, а не «${authorEffort}»`);
}

const moderationModel = process.env.AI_MODERATION_MODEL || 'claude-opus-5-5';

const authorModel = process.env.AI_AUTHOR_MODEL || 'claude-haiku-5-5';

const embedModel = provider === 'local'
  ? process.env.OLLAMA_EMBED_MODEL || 'bge-m3'
  : process.env.VOYAGE_MODEL || 'voyage-4';

/*
  ИИ-ассистент модератора (спека 54) и помощник автора (спека 55): настройки — по назначению
  запроса (purpose). ИИ включён, если у выбранной реализации есть адрес или ключ (п. 10). Сам
  ключ сюда не кладём: SDK читает ANTHROPIC_API_KEY сам.
  fallbacks: у Haiku серверного fallback нет (план 55, реш. 1) — с ним отказ так и остаётся
  отказом, а список моделей даёт 400. Поставят в AI_AUTHOR_MODEL Opus — fallback включится сам
*/
export const aiConfig = {
  provider,
  enabled: provider === 'local' ? Boolean(process.env.OLLAMA_URL) : Boolean(process.env.ANTHROPIC_API_KEY),
  ollama: {
    url: (process.env.OLLAMA_URL ?? '').replace(/\/+$/, ''),
    model: process.env.OLLAMA_MODEL || 'qwen3:14b',
    numCtx: positiveNumber(process.env.OLLAMA_NUM_CTX, 32768),
    moderation: { think: true, timeoutMs: positiveNumber(process.env.OLLAMA_TIMEOUT_MS, 180_000) },
    // Спека 55, п. 10: задачи проще, а ждать в интерфейсе рассуждений долго
    author: { think: false, timeoutMs: 60_000 }
  },
  // Пустое значение effort — параметр не отправляется (модель без effort)
  anthropic: {
    moderation: {
      model: moderationModel,
      effort: moderationEffort === '' ? undefined : moderationEffort,
      fallbacks: !moderationModel.startsWith('claude-haiku')
    },
    author: {
      model: authorModel,
      effort: authorEffort === '' ? undefined : authorEffort,
      fallbacks: !authorModel.startsWith('claude-haiku')
    }
  },
  // Зависший pending (п. 4): больше таймаута любой реализации
  staleMs: 5 * 60_000,
  /*
    Эмбеддинги (спека 56, п. 1–2): провайдер следует за AI_PROVIDER — local → Ollama, anthropic →
    Voyage AI, — но включаются отдельно от генерации: нужен OLLAMA_URL или VOYAGE_API_KEY.
    Ключ Voyage кладём сюда: SDK нет, и читать env больше негде.
    key — модель в post_embeddings (реш. 3 плана): смена модели или провайдера — новые векторы.
    Пороги сходства (searchMin, similarMin) у моделей разные (п. 15)
  */
  embed: {
    enabled: provider === 'local' ? Boolean(process.env.OLLAMA_URL) : Boolean(process.env.VOYAGE_API_KEY),
    model: embedModel,
    key: `${provider === 'local' ? 'ollama' : 'voyage'}/${embedModel}`,
    voyageKey: process.env.VOYAGE_API_KEY ?? '',
    numCtx: 8192,
    timeoutMs: { query: 5_000, document: 30_000 },
    batch: 16,
    maxChars: 8000,
    retryMs: 5 * 60_000,
    ...(provider === 'local' ? { searchMin: 0.42, similarMin: 0.5 } : { searchMin: 0.35, similarMin: 0.5 })
  }
}

function positiveNumber(value: string | undefined, fallback: number){
  const number = Number(value);

  return value && Number.isFinite(number) && number > 0 ? number : fallback;
}

function isEffort(value: string): value is 'low' | 'medium' | 'high' | 'xhigh' | 'max' {
  return [ 'low', 'medium', 'high', 'xhigh', 'max' ].includes(value);
}
