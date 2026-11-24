'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { aiEnabled, LlmError } from "@/globals/ai";
import { rateLimiters } from "@/globals/rateLimiter";
import { postAssistDto, type PostAssistDto } from "@/domains/posts/dto/postAssistRequests";
import { assistPost } from "@/domains/posts/policy";
import { assistTextProblem, type PostAssistKind } from "@/domains/posts/shared/postAssist";
import { checkPostStyle, findPostRoutePoints, suggestPostLeads, suggestPostTags, suggestPostTitles } from "@/domains/posts/shared/postAssistRun";
import { consumeOrFail } from "@/shared/rateLimitAction";

/*
  Помощник автора в редакторе (спека 55): пять функций, вход — текущая форма, а не пост из базы.
  Ничего не сохраняют: предложение применяет автор на клиенте. Порядок (реш. 4 плана) — права,
  ИИ включён, текст, лимиты, модель. Текст проверяется до лимита: ошибка входа не тратит очко
*/
const assistClient = actionAuthClient.inputSchema(postAssistDto);

export const suggestPostTitleAction = assistClient
  .action(async ({ parsedInput, ctx: { auth } }) => run('title', parsedInput, auth.id, suggestPostTitles));

export const suggestPostLeadAction = assistClient
  .action(async ({ parsedInput, ctx: { auth } }) => run('lead', parsedInput, auth.id, suggestPostLeads));

export const suggestPostTagsAction = assistClient
  .action(async ({ parsedInput, ctx: { auth } }) => run('tags', parsedInput, auth.id, suggestPostTags));

export const checkPostStyleAction = assistClient
  .action(async ({ parsedInput, ctx: { auth } }) => run('style', parsedInput, auth.id, checkPostStyle));

export const findPostRouteAction = assistClient
  .action(async ({ parsedInput, ctx: { auth } }) => {
    if(parsedInput.type !== 'travel'){
      actionError(400, 'Места ищутся только у путешествия');
    }

    return run('route', parsedInput, auth.id, findPostRoutePoints);
  });

async function run<T>(kind: PostAssistKind, input: PostAssistDto, userId: number, suggest: (input: PostAssistDto) => Promise<T>): Promise<T> {
  await guard(kind, input, userId);

  try {
    return await suggest(input);
  }
  catch(error){
    if(error instanceof LlmError){
      actionError(502, error.message);
    }

    // Прочее — общий обработчик actionClient: лог и 500
    throw error;
  }
}

async function guard(kind: PostAssistKind, input: PostAssistDto, userId: number){
  await CONTAINER.boucerService.breakIfCant(assistPost);

  if(!aiEnabled){
    actionError(409, 'Помощник выключен');
  }

  const problem = assistTextProblem(kind, input.content);

  if(problem){
    actionError(400, problem);
  }

  await consumeOrFail(rateLimiters.aiAssist, String(userId));
  await consumeOrFail(rateLimiters.aiAssistDay, String(userId));
}
