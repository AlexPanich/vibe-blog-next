import type { z } from 'zod';

export type LlmParseInput<T> = {
  system: string,
  prompt: string,
  schema: z.ZodType<T>,
  maxTokens: number
}

export type LlmParseResult<T> = {
  data: T,
  model: string,
  inputTokens: number,
  outputTokens: number
}

// Сбой с короткой причиной для человека, без стека
export class LlmError extends Error {
  name = 'LlmError';
}

// Эмбеддинги (спека 56): document — текст поста, query — поисковый запрос
export type LlmEmbedInput = {
  texts: string[],
  kind: 'document' | 'query'
}

// Сырые векторы в порядке texts; нормирует вызывающий
export type LlmEmbedResult = {
  vectors: number[][],
  tokens: number
}
