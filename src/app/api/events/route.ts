import { liveBus, type LiveSubscriber } from "@/globals/liveBus";
import { getAuthUser } from "@/shared/auth";
import { getUserIp } from "@/shared/request";

export const dynamic = 'force-dynamic';

// Без комментария-пинга прокси и браузер рвут простаивающее соединение
const HEARTBEAT_MS = 25_000;

/*
  Живой канал (SSE): вошедшему — его события и широковещательные, гостю — только
  широковещательные (спека 22), лимит потоков гостя — по IP. Переподключения держит
  глобальный лимит proxy.ts
*/
export async function GET(request: Request){
  const channel = await liveChannel();

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller){
      let closed = false;

      const subscriber: LiveSubscriber = {
        send: chunk => controller.enqueue(encoder.encode(chunk)),
        close: () => finish()
      };

      const heartbeat = setInterval(() => {
        try{
          subscriber.send(': ping\n\n');
        }
        catch{
          finish();
        }
      }, HEARTBEAT_MS);

      function finish(){
        if(closed){
          return;
        }

        closed = true;
        clearInterval(heartbeat);
        channel.unsubscribe(subscriber);

        try{
          controller.close();
        }
        catch{
          // уже закрыт
        }
      }

      cleanup = finish;
      request.signal.addEventListener('abort', finish);
      channel.subscribe(subscriber);
      // Первый байт сразу: браузер получает заголовки и событие open
      subscriber.send(': connected\n\n');
    },
    cancel(){
      cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      // Не буферизовать: ни nginx, ни сжатие Next
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'none',
    }
  });
}

async function liveChannel(){
  const user = await getAuthUser();

  if(user){
    return {
      subscribe: (subscriber: LiveSubscriber) => liveBus.subscribe(user.id, subscriber),
      unsubscribe: (subscriber: LiveSubscriber) => liveBus.unsubscribe(user.id, subscriber)
    };
  }

  const ip = await getUserIp();

  return {
    subscribe: (subscriber: LiveSubscriber) => liveBus.subscribeGuest(ip, subscriber),
    unsubscribe: (subscriber: LiveSubscriber) => liveBus.unsubscribeGuest(ip, subscriber)
  };
}
