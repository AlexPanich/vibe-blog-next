import 'server-only';
import { aiConfig } from "@/config/ai";
import { ollamaParse } from "@/core/llm/ollamaParse";
import type { LlmParseInput, LlmParseResult } from "@/core/llm/types";

/*
  Модель для разбора (спека 54, п. 5): реализация выбирается по AI_PROVIDER один раз, код фичи
  импортирует только этот модуль. SDK Anthropic грузится динамически — без режима anthropic
  его нет в процессе вовсе
*/
export const aiEnabled = aiConfig.enabled;

export const aiParse: <T>(input: LlmParseInput<T>) => Promise<LlmParseResult<T>> = aiConfig.provider === 'local'
  ? input => ollamaParse(aiConfig.ollama, input)
  : async input => (await import('@/core/llm/anthropicParse')).anthropicParse(aiConfig.anthropic, input);

export { LlmError } from "@/core/llm/types";
