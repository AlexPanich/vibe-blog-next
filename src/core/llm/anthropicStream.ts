import Anthropic from '@anthropic-ai/sdk';
import { LlmError, type LlmStreamInput, type LlmStreamUsage } from './types';
import { toLlmError } from './anthropicErrors';
import type { AnthropicOptions } from './anthropicParse';

let client: Anthropic | undefined;

/*
  Потоковый ответ Claude API (спека 57, п. 13): beta.messages.stream, текстовые дельты по мере
  генерации, затем finalMessage — причина остановки и токены. Отказ и обрыв по max_tokens —
  LlmError, но уже отданные дельты у вызывающего остаются. Отмена (signal) — APIUserAbortError,
  пробрасывается как есть (план 57, реш. 3). У Haiku рассуждения выключены (реш. 1). Системный
  промпт одинаков для всех запросов — на нём cache_control; он короче минимума кэша Haiku, и
  кэш может не сработать, это не ошибка
*/
export async function* anthropicStream(options: AnthropicOptions, input: LlmStreamInput): AsyncGenerator<string, LlmStreamUsage> {
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 2 });

  let message: Anthropic.Beta.BetaMessage;

  try {
    const stream = client.beta.messages.stream({
      model: options.model,
      max_tokens: input.maxTokens,
      ...(options.fallbacks ? { betas: [ 'server-side-fallback-2026-07-01' ], fallbacks: 'default' as const } : {}),
      ...(options.disableThinking ? { thinking: { type: 'disabled' as const } } : {}),
      ...(options.effort ? { output_config: { effort: options.effort } } : {}),
      system: [ { type: 'text', text: input.system, cache_control: { type: 'ephemeral' } } ],
      messages: [ { role: 'user', content: input.prompt } ]
    }, { signal: input.signal });

    for await (const event of stream){
      if(event.type === 'content_block_delta' && event.delta.type === 'text_delta'){
        yield event.delta.text;
      }
    }

    message = await stream.finalMessage();
  }
  catch(error){
    throw toLlmError(error);
  }

  if(message.stop_reason === 'refusal'){
    throw new LlmError('Модель отказалась отвечать');
  }

  if(message.stop_reason === 'max_tokens'){
    throw new LlmError('Ответ модели оборвался');
  }

  const usage = message.usage;

  return {
    // После fallback ответила другая модель — так и записываем
    model: message.model,
    inputTokens: usage.input_tokens + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
    outputTokens: usage.output_tokens
  };
}
