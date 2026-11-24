import 'server-only';
import { aiConfig } from "@/config/ai";
import { ollamaParse } from "@/core/llm/ollamaParse";
import { ollamaEmbed } from "@/core/llm/ollamaEmbed";
import { voyageEmbed } from "@/core/llm/voyageEmbed";
import { normalize } from "@/core/vectors";
import { LlmError, type LlmEmbedInput, type LlmParseInput, type LlmParseResult } from "@/core/llm/types";

// Назначение запроса: по нему выбираются модель, effort, think и таймаут (спека 55, п. 9)
export type AiPurpose = 'moderation' | 'author'

export type AiParseInput<T> = LlmParseInput<T> & { purpose: AiPurpose }

/*
  Модель для разбора (спека 54, п. 5): реализация выбирается по AI_PROVIDER один раз, код фичи
  импортирует только этот модуль. SDK Anthropic грузится динамически — без режима anthropic
  его нет в процессе вовсе. purpose в core/llm не уходит: о назначениях он не знает
*/
export const aiEnabled = aiConfig.enabled;

export const aiParse: <T>(input: AiParseInput<T>) => Promise<LlmParseResult<T>> = aiConfig.provider === 'local'
  ? ({ purpose, ...input }) => ollamaParse({
    url: aiConfig.ollama.url,
    model: aiConfig.ollama.model,
    numCtx: aiConfig.ollama.numCtx,
    ...aiConfig.ollama[purpose]
  }, input)
  : async ({ purpose, ...input }) => (await import('@/core/llm/anthropicParse')).anthropicParse(aiConfig.anthropic[purpose], input);

/*
  Эмбеддинги (спека 56, п. 3): провайдер — по AI_PROVIDER (Ollama или Voyage), включаются
  отдельно от генерации. Векторы нормированы (длина 1), model — ключ из конфига, а не имя из
  ответа: Ollama отвечает bge-m3:latest на bge-m3 (реш. 3 плана). Таймаут — по kind:
  запрос ждёт пользователь (5 с), документы считаются в фоне
*/
export const embedEnabled = aiConfig.embed.enabled;

export const embedModel = aiConfig.embed.key;

export async function aiEmbed(input: LlmEmbedInput): Promise<{ vectors: Float32Array[], model: string }> {
  const timeoutMs = aiConfig.embed.timeoutMs[input.kind];
  const result = aiConfig.provider === 'local'
    ? await ollamaEmbed({ url: aiConfig.ollama.url, model: aiConfig.embed.model, numCtx: aiConfig.embed.numCtx, timeoutMs }, input)
    : await voyageEmbed({ apiKey: aiConfig.embed.voyageKey, model: aiConfig.embed.model, timeoutMs }, input);
  let vectors: Float32Array[];

  try {
    vectors = result.vectors.map(normalize);
  }
  catch {
    throw new LlmError('Пустой вектор');
  }

  return { vectors, model: embedModel };
}

export { LlmError };
