import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { LlmError, type LlmParseInput, type LlmParseResult } from './types';
import { toLlmError } from './anthropicErrors';

export type AnthropicOptions = {
  model: string,
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | undefined,
  // Серверный fallback при отказе; у Haiku его нет — с ним запрос падает
  fallbacks: boolean,
  // thinking: { type: 'disabled' } — только у потока (спека 57); разбор его не передаёт
  disableThinking: boolean
}

let client: Anthropic | undefined;

/*
  Structured output через Claude API: один вызов beta.messages.create с форматом из zod-схемы.
  Не parse: он разбирает ответ раньше, чем видно stop_reason, и оборванный ответ выглядел бы
  ошибкой схемы. Отказы обрабатывает серверный fallback (fallbacks: 'default'), если он включён:
  у Haiku серверного fallback нет. Финальный refusal — сбой. thinking не передаём: у Opus 5.5 и
  Haiku 5.5 он адаптивный, глубину задаёт effort. Системный промпт одинаков для всех
  запросов — на нём cache_control
*/
export async function anthropicParse<T>(options: AnthropicOptions, input: LlmParseInput<T>): Promise<LlmParseResult<T>> {
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 2 });

  let response;

  try {
    response = await client.beta.messages.create({
      model: options.model,
      max_tokens: input.maxTokens,
      ...(options.fallbacks ? { betas: [ 'server-side-fallback-2026-07-01' ], fallbacks: 'default' as const } : {}),
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
    throw new LlmError('Модель отказалась отвечать');
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
