import { z } from 'zod';
import { LlmError, type LlmParseInput, type LlmParseResult } from './types';

export type OllamaOptions = {
  url: string,
  model: string,
  numCtx: number,
  timeoutMs: number
}

type OllamaMessage = { role: 'system' | 'user' | 'assistant', content: string }

type OllamaResponse = {
  model: string,
  message: { content: string },
  prompt_eval_count?: number,
  eval_count?: number
}

const ATTEMPTS = 3;

/*
  Structured output через Ollama POST /api/chat. Ответ проверяется zod-схемой; не прошёл —
  в повтор уходит текст ошибки, до трёх попыток. think: true — без рассуждений Qwen3 не держит
  указания промпта (ложные wrong_type), окно на них хватает.
  num_ctx задаём явно: сверх него Ollama молча режет вход
*/
export async function ollamaParse<T>(options: OllamaOptions, input: LlmParseInput<T>): Promise<LlmParseResult<T>> {
  const messages: OllamaMessage[] = [
    { role: 'system', content: input.system },
    { role: 'user', content: input.prompt }
  ];
  const format = z.toJSONSchema(input.schema);
  let inputTokens = 0;
  let outputTokens = 0;

  for(let attempt = 1; attempt <= ATTEMPTS; attempt++){
    const response = await chat(options, { messages, format, maxTokens: input.maxTokens });
    const content = response.message.content;

    inputTokens += response.prompt_eval_count ?? 0;
    outputTokens += response.eval_count ?? 0;

    const problem = parseProblem(content, input.schema);

    if(problem.ok){
      return { data: problem.data, model: response.model, inputTokens, outputTokens };
    }

    messages.push(
      { role: 'assistant', content },
      { role: 'user', content: `Ответ не прошёл проверку схемы. Исправь и верни только JSON.\n${problem.error}` }
    );
  }

  throw new LlmError('Ответ модели не прошёл проверку');
}

async function chat(options: OllamaOptions, request: { messages: OllamaMessage[], format: unknown, maxTokens: number }): Promise<OllamaResponse> {
  let response: Response;

  try {
    response = await fetch(`${options.url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(options.timeoutMs),
      body: JSON.stringify({
        model: options.model,
        stream: false,
        think: true,
        format: request.format,
        options: { num_ctx: options.numCtx, num_predict: request.maxTokens },
        messages: request.messages
      })
    });
  }
  catch(error){
    if(error instanceof DOMException && error.name === 'TimeoutError'){
      throw new LlmError(`Локальная модель не ответила за ${Math.round(options.timeoutMs / 1000)} с`);
    }

    throw new LlmError('Ollama недоступна');
  }

  if(!response.ok){
    throw new LlmError(`Ollama: ${response.status}`);
  }

  try {
    return await response.json() as OllamaResponse;
  }
  catch {
    throw new LlmError('Ollama: ответ не JSON');
  }
}

// Внешняя обёртка ```json … ``` снимается: модели добавляют её и при заданном format
function parseProblem<T>(content: string, schema: z.ZodType<T>): { ok: true, data: T } | { ok: false, error: string } {
  const text = content.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/, '$1');
  let json: unknown;

  try {
    json = JSON.parse(text);
  }
  catch(error){
    return { ok: false, error: `JSON не разобран: ${error instanceof Error ? error.message : String(error)}` };
  }

  const parsed = schema.safeParse(json);

  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: z.prettifyError(parsed.error) };
}
