import { LlmError, type LlmEmbedInput, type LlmEmbedResult } from './types';

export type OllamaEmbedOptions = {
  url: string,
  model: string,
  numCtx: number,
  timeoutMs: number
}

type OllamaEmbedResponse = {
  model: string,
  embeddings: number[][],
  prompt_eval_count?: number
}

/*
  Эмбеддинги через Ollama POST /api/embed. num_ctx задаём явно: у части моделей по умолчанию
  2048, а сверх контекста Ollama режет вход молча (truncate). kind не передаётся: у bge-m3
  нет префиксов запроса и документа
*/
export async function ollamaEmbed(options: OllamaEmbedOptions, input: LlmEmbedInput): Promise<LlmEmbedResult> {
  let response: Response;

  try {
    response = await fetch(`${options.url}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(options.timeoutMs),
      body: JSON.stringify({
        model: options.model,
        input: input.texts,
        truncate: true,
        options: { num_ctx: options.numCtx }
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

  let json: OllamaEmbedResponse;

  try {
    json = await response.json() as OllamaEmbedResponse;
  }
  catch {
    throw new LlmError('Ollama: ответ не JSON');
  }

  if(!Array.isArray(json.embeddings) || json.embeddings.length !== input.texts.length){
    throw new LlmError('Ollama: векторов не столько, сколько текстов');
  }

  return { vectors: json.embeddings, tokens: json.prompt_eval_count ?? 0 };
}
