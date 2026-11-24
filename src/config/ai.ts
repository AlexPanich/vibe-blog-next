import 'server-only';

const provider = process.env.AI_PROVIDER || 'local';

if(provider !== 'local' && provider !== 'anthropic'){
  throw new Error(`AI_PROVIDER: ожидается local или anthropic, а не «${provider}»`);
}

const effort = process.env.AI_MODERATION_EFFORT ?? 'low';

if(effort !== '' && !isEffort(effort)){
  throw new Error(`AI_MODERATION_EFFORT: ожидается low, medium, high, xhigh, max или пустое значение, а не «${effort}»`);
}

/*
  ИИ-ассистент модератора (спека 54). ИИ включён, если у выбранной реализации есть адрес или
  ключ (п. 10). Сам ключ сюда не кладём: SDK читает ANTHROPIC_API_KEY сам
*/
export const aiConfig = {
  provider,
  enabled: provider === 'local' ? Boolean(process.env.OLLAMA_URL) : Boolean(process.env.ANTHROPIC_API_KEY),
  ollama: {
    url: (process.env.OLLAMA_URL ?? '').replace(/\/+$/, ''),
    model: process.env.OLLAMA_MODEL || 'qwen3:14b',
    numCtx: positiveNumber(process.env.OLLAMA_NUM_CTX, 32768),
    timeoutMs: positiveNumber(process.env.OLLAMA_TIMEOUT_MS, 180_000)
  },
  anthropic: {
    model: process.env.AI_MODERATION_MODEL || 'claude-opus-5-5',
    // Пустое значение — параметр не отправляется (модель без effort)
    effort: effort === '' ? undefined : effort
  },
  // Зависший pending (п. 4): больше таймаута любой реализации
  staleMs: 5 * 60_000
}

function positiveNumber(value: string | undefined, fallback: number){
  const number = Number(value);

  return value && Number.isFinite(number) && number > 0 ? number : fallback;
}

function isEffort(value: string): value is 'low' | 'medium' | 'high' | 'xhigh' | 'max' {
  return [ 'low', 'medium', 'high', 'xhigh', 'max' ].includes(value);
}
