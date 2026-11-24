import { readNdjson } from '../ndjson';
import { LlmError, type LlmStreamInput, type LlmStreamUsage } from './types';
import type { OllamaOptions } from './ollamaParse';

type OllamaChunk = {
  model?: string,
  message?: { content?: string },
  done?: boolean,
  done_reason?: string,
  prompt_eval_count?: number,
  eval_count?: number,
  error?: string
}

/*
  Потоковый ответ Ollama POST /api/chat, stream: true (спека 57, п. 13): строки NDJSON, в каждой —
  кусок текста, в последней (done: true) — счётчики токенов. Отмена вызывающего (input.signal)
  пробрасывается как есть — это не ошибка (план 57, реш. 3); свой таймаут — LlmError
*/
export async function* ollamaStream(options: OllamaOptions, input: LlmStreamInput): AsyncGenerator<string, LlmStreamUsage> {
  const signal = AbortSignal.any([ input.signal, AbortSignal.timeout(options.timeoutMs) ]);
  let response: Response;

  try {
    response = await fetch(`${options.url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: options.model,
        stream: true,
        think: options.think,
        options: { num_ctx: options.numCtx, num_predict: input.maxTokens },
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.prompt }
        ]
      })
    });
  }
  catch(error){
    throw connectionError(error, input.signal, options.timeoutMs);
  }

  if(!response.ok || !response.body){
    throw new LlmError(`Ollama: ${response.status}`);
  }

  try {
    for await (const value of readNdjson(response.body)){
      const chunk = value as OllamaChunk;

      if(chunk.error){
        throw new LlmError(`Ollama: ${chunk.error}`);
      }

      if(chunk.done){
        if(chunk.done_reason === 'length'){
          throw new LlmError('Ответ модели оборвался');
        }

        return {
          model: chunk.model ?? options.model,
          inputTokens: chunk.prompt_eval_count ?? 0,
          outputTokens: chunk.eval_count ?? 0
        };
      }

      const content = chunk.message?.content;

      if(content){
        yield content;
      }
    }
  }
  catch(error){
    if(error instanceof LlmError){
      throw error;
    }

    if(error instanceof SyntaxError){
      throw new LlmError('Ollama: ответ не JSON');
    }

    throw connectionError(error, input.signal, options.timeoutMs);
  }

  throw new LlmError('Ответ модели оборвался');
}

function connectionError(error: unknown, signal: AbortSignal, timeoutMs: number){
  if(signal.aborted){
    return error;
  }

  if(error instanceof DOMException && error.name === 'TimeoutError'){
    return new LlmError(`Локальная модель не ответила за ${Math.round(timeoutMs / 1000)} с`);
  }

  return new LlmError('Ollama недоступна');
}
