import Anthropic from '@anthropic-ai/sdk';
import { LlmError } from './types';

/*
  Ошибка SDK → LlmError с короткой причиной; общая у anthropicParse и anthropicStream.
  Отмена (APIUserAbortError, подкласс APIError) пробрасывается как есть: это не сбой (план 57,
  реш. 3). Прочее — тоже как есть
*/
export function toLlmError(error: unknown){
  if(error instanceof Anthropic.APIUserAbortError){
    return error;
  }
  else if(error instanceof Anthropic.AuthenticationError){
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
