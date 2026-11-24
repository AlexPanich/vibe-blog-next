import 'server-only';
import { aiConfig } from "@/config/ai";
import { ollamaParse } from "@/core/llm/ollamaParse";
import type { LlmParseInput, LlmParseResult } from "@/core/llm/types";

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

export { LlmError } from "@/core/llm/types";
