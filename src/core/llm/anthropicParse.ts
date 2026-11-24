import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { LlmError, type LlmParseInput, type LlmParseResult } from './types';

export type AnthropicOptions = {
  model: string,
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | undefined
}

let client: Anthropic | undefined;

/*
  Structured output через Claude API: один вызов beta.messages.create с форматом из zod-схемы.
  Не parse: он разбирает ответ раньше, чем видно stop_reason, и оборванный ответ выглядел бы
  ошибкой схемы. Отказы обрабатывает серверный fallback (fallbacks: 'default'); финальный
  refusal — сбой. thinking не передаём:
  у Opus 5.5 он адаптивный всегда, глубину задаёт effort. Системный промпт одинаков для всех
  запросов — на нём cache_control
*/
export async function anthropicParse<T>(options: AnthropicOptions, input: LlmParseInput<T>): Promise<LlmParseResult<T>> {
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 2 });

  let response;

  try {
    response = await client.beta.messages.create({
      model: options.model,
      max_tokens: input.maxTokens,
      betas: [ 'server-side-fallback-2026-07-01' ],
      fallbacks: 'default',
      system: [ { type: 'text', text: input.system, cache_control: { type: 'ephemeral' } } ],
      messages: [ { role: 'user', content: input.prompt } ],
      output_config: {
        format: betaZodOutputFormat(input.schema),
        ...(options.effort ? { effort: options.effort } : {})
      }
    });
  }
  catch(error){
    throw toLlmError(error);
  }

  if(response.stop_reason === 'refusal'){
    throw new LlmError('Модель отказалась разбирать пост');
  }

  if(response.stop_reason === 'max_tokens'){
    throw new LlmError('Ответ модели оборвался');
  }

  const data = parseOutput(response.content, input.schema);
  const usage = response.usage;

  return {
    data,
    // После fallback ответила другая модель — так и записываем
    model: response.model,
    inputTokens: usage.input_tokens + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
    outputTokens: usage.output_tokens
  };
}

function parseOutput<T>(content: Anthropic.Beta.BetaContentBlock[], schema: LlmParseInput<T>['schema']): T {
  const text = content.filter(block => block.type === 'text').map(block => block.text).join('');
  let json: unknown;

  try {
    json = JSON.parse(text);
  }
  catch {
    throw new LlmError('Ответ модели не прошёл проверку');
  }

  const parsed = schema.safeParse(json);

  if(!parsed.success){
    throw new LlmError('Ответ модели не прошёл проверку');
  }

  return parsed.data;
}

function toLlmError(error: unknown){
  if(error instanceof Anthropic.AuthenticationError){
    return new LlmError('Неверный ключ API');
  }
  else if(error instanceof Anthropic.RateLimitError){
    return new LlmError('Лимит запросов API');
  }
  else if(error instanceof Anthropic.APIConnectionError){
    // APIConnectionTimeoutError — его подкласс
    return new LlmError('API недоступен');
  }
  else if(error instanceof Anthropic.APIError){
    return new LlmError(`API: ${error.status}`);
  }

  return error;
}
