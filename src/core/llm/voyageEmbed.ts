import { LlmError, type LlmEmbedInput, type LlmEmbedResult } from './types';

export type VoyageEmbedOptions = {
  apiKey: string,
  model: string,
  timeoutMs: number
}

type VoyageResponse = {
  data: { embedding: number[], index: number }[],
  model: string,
  usage?: { total_tokens?: number }
}

const URL = 'https://api.voyageai.com/v1/embeddings';

/*
  Эмбеддинги Voyage AI через fetch, без SDK. input_type — document для поста, query для запроса:
  модель кодирует их по-разному. output_dimension не передаём — размер модели по умолчанию.
  Векторы приходят в data по index, не обязательно по порядку
*/
export async function voyageEmbed(options: VoyageEmbedOptions, input: LlmEmbedInput): Promise<LlmEmbedResult> {
  let response: Response;

  try {
    response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${options.apiKey}` },
      signal: AbortSignal.timeout(options.timeoutMs),
      body: JSON.stringify({
        input: input.texts,
        model: options.model,
        input_type: input.kind,
        truncation: true
      })
    });
  }
  catch(error){
    if(error instanceof DOMException && error.name === 'TimeoutError'){
      throw new LlmError(`Voyage не ответил за ${Math.round(options.timeoutMs / 1000)} с`);
    }

    throw new LlmError('Voyage недоступен');
  }

  if(response.status === 401){
    throw new LlmError('Voyage: неверный ключ');
  }
  else if(response.status === 429){
    throw new LlmError('Voyage: превышен лимит запросов');
  }
  else if(!response.ok){
    throw new LlmError(`Voyage: ${response.status} ${await errorDetail(response)}`.trim());
  }

  let json: VoyageResponse;

  try {
    json = await response.json() as VoyageResponse;
  }
  catch {
    throw new LlmError('Voyage: ответ не JSON');
  }

  if(!Array.isArray(json.data) || json.data.length !== input.texts.length){
    throw new LlmError('Voyage: векторов не столько, сколько текстов');
  }

  const vectors = [ ...json.data ].sort((a, b) => a.index - b.index).map(item => item.embedding);

  return { vectors, tokens: json.usage?.total_tokens ?? 0 };
}

async function errorDetail(response: Response){
  try {
    const json = await response.json() as { detail?: unknown };

    return typeof json.detail === 'string' ? json.detail.slice(0, 200) : '';
  }
  catch {
    return '';
  }
}
