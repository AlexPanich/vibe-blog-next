import { aiConfig } from "@/config/ai";
import { aiStream, LlmError } from "@/globals/ai";
import { askStreams } from "@/globals/askStreams";
import { getAuthUser } from "@/shared/auth";
import { getUserIp } from "@/shared/request";
import { isSameOrigin } from "@/shared/requestOrigin";
import { postAskDto } from "@/domains/posts/dto/postAskRequests";
import type { PostAskEvent } from "@/domains/posts/dto/postAskResources";
import { consumeAskLimits } from "@/domains/posts/shared/postAskLimits";
import { ASK_SYSTEM, askEnabled, askPrompt, askSourceResource, askSources, type AskSource } from "@/domains/posts/shared/postAskRun";

export const dynamic = 'force-dynamic';

type AskLog = { model: string | null, inputTokens: number | null, outputTokens: number | null, sources: number, ms: number, aborted: boolean };

const STREAM_HEADERS = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  // Не буферизовать: ни nginx, ни сжатие Next
  'X-Accel-Buffering': 'no',
  'Content-Encoding': 'none'
};

/*
  «Спросить блог» (спека 57, п. 11–18): вопрос → источники → NDJSON-поток ответа. Всё, в чём можно
  отказать, — до потока, обычным JSON { message } со статусом (план 57, реш. 6): фича → Origin →
  тело → занятость потока → вектор запроса → источники → лимиты генерации. «Ничего не нашлось» —
  поток без генерации, лимиты не списываются (п. 6). Вопрос, IP и пользователь в лог не пишутся
*/
export async function POST(request: Request){
  const started = Date.now();

  if(!askEnabled){
    return message(404, 'Не найдено');
  }

  if(!isSameOrigin(request)){
    return message(403, 'Запрос не с этого сайта');
  }

  let body: unknown;

  try {
    body = await request.json();
  }
  catch {
    return message(400, 'Не удалось прочитать вопрос');
  }

  const parsed = postAskDto.safeParse(body);

  if(!parsed.success){
    return message(400, parsed.error.issues[0]?.message ?? 'Не удалось прочитать вопрос');
  }

  const question = parsed.data.question;
  const user = await getAuthUser();
  const ip = await getUserIp();
  const key = user ? `u:${user.id}` : `ip:${ip}`;

  if(!askStreams.tryAcquire(key)){
    return message(429, 'Дождитесь ответа на прошлый вопрос');
  }

  // Поток освобождает ключ сам, в finally; до потока — здесь
  let streaming = false;

  try {
    const found = await askSources(question);

    if(!found.ok){
      return found.reason === 'limit'
        ? message(429, 'Слишком много вопросов, подождите минуту')
        : message(503, 'Поиск по блогу сейчас недоступен');
    }

    if(found.sources.length === 0){
      log({ model: null, inputTokens: null, outputTokens: null, sources: 0, ms: Date.now() - started, aborted: false });

      return new Response(ndjson([ { type: 'sources', posts: [] }, { type: 'done' } ]), { headers: STREAM_HEADERS });
    }

    const limited = await consumeAskLimits({ userId: user?.id ?? null, ip });

    if(limited){
      return message(429, limited);
    }

    streaming = true;

    return new Response(answerStream({ request, question, sources: found.sources, started, release: () => askStreams.release(key) }), { headers: STREAM_HEADERS });
  }
  finally {
    if(!streaming){
      askStreams.release(key);
    }
  }
}

/*
  Источники первыми, затем дельты и done либо error (п. 11). Обрыв со стороны клиента
  (request.signal, cancel потока) обрывает и запрос к модели (п. 15): закрываемся молча
*/
function answerStream({ request, question, sources, started, release }: { request: Request, question: string, sources: AskSource[], started: number, release: () => void }){
  const abort = new AbortController();
  const encoder = new TextEncoder();
  const stop = () => abort.abort();

  request.signal.addEventListener('abort', stop);

  return new ReadableStream<Uint8Array>({
    start(controller){
      const send = (event: PostAskEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
        catch {
          // клиент ушёл, поток закрыт
        }
      };

      void (async () => {
        const entry: AskLog = { model: null, inputTokens: null, outputTokens: null, sources: sources.length, ms: 0, aborted: false };

        try {
          send({ type: 'sources', posts: sources.map(askSourceResource) });

          const generator = aiStream({
            purpose: 'ask',
            system: ASK_SYSTEM,
            prompt: askPrompt(sources, question),
            maxTokens: aiConfig.ask.maxTokens,
            signal: abort.signal
          });
          let step = await generator.next();

          while(!step.done){
            send({ type: 'delta', text: step.value });
            step = await generator.next();
          }

          entry.model = step.value.model;
          entry.inputTokens = step.value.inputTokens;
          entry.outputTokens = step.value.outputTokens;
          send({ type: 'done' });
        }
        catch(error){
          if(abort.signal.aborted){
            entry.aborted = true;
          }
          else if(error instanceof LlmError){
            send({ type: 'error', message: error.message });
          }
          else{
            console.error('Спросить блог', error);
            send({ type: 'error', message: 'Не удалось получить ответ' });
          }
        }
        finally {
          request.signal.removeEventListener('abort', stop);
          release();

          try {
            controller.close();
          }
          catch {
            // уже закрыт
          }

          entry.ms = Date.now() - started;
          log(entry);
        }
      })();
    },
    cancel(){
      stop();
    }
  });
}

function ndjson(events: PostAskEvent[]){
  return events.map(event => `${JSON.stringify(event)}\n`).join('');
}

function message(status: number, text: string){
  return Response.json({ message: text }, { status });
}

function log(entry: AskLog){
  console.info('Спросить блог', entry);
}
