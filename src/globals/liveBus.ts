import 'server-only';
import type { LiveBroadcastEventType, LiveEvents, LiveEventType } from "@/shared/liveEvents";

export type LiveSubscriber = {
  send: (chunk: string) => void,
  close: () => void
}

// Вкладки одного пользователя: шестой поток закрывает самый старый
const STREAMS_PER_USER = 5;

// Гости — по IP: без прокси перед приложением это один bucket на всех (config/proxy.ts)
const STREAMS_PER_GUEST_IP = 5;

/*
  Шина в памяти процесса: подписчики по userId и гости по IP. Живёт в globalThis — route
  handler и actions собираются в разные модули, а в dev ещё и HMR. Работает в одном процессе
  Node: несколько инстансов потребуют внешней шины (Redis pub/sub)
*/
const store = globalThis as unknown as {
  liveBusSubscribers?: Map<number, LiveSubscriber[]>,
  liveBusGuests?: Map<string, LiveSubscriber[]>
};
const subscribers = store.liveBusSubscribers ??= new Map<number, LiveSubscriber[]>();
const guests = store.liveBusGuests ??= new Map<string, LiveSubscriber[]>();

export const liveBus = {
  // Вызывать после commit: откаченное действие не должно долететь до браузера
  publish<T extends LiveEventType>(userId: number, type: T, data: LiveEvents[T]){
    sendAll(subscribers, userId, chunk(type, data));
  },

  // Всем вошедшим, кроме exceptUserIds, и всем гостям. Тоже после commit
  broadcast<T extends LiveBroadcastEventType>(type: T, data: LiveEvents[T], exceptUserIds: number[] = []){
    const message = chunk(type, data);

    for(const userId of [ ...subscribers.keys() ]){
      if(!exceptUserIds.includes(userId)){
        sendAll(subscribers, userId, message);
      }
    }

    for(const ip of [ ...guests.keys() ]){
      sendAll(guests, ip, message);
    }
  },

  subscribe(userId: number, subscriber: LiveSubscriber){
    add(subscribers, userId, subscriber, STREAMS_PER_USER);
  },

  unsubscribe(userId: number, subscriber: LiveSubscriber){
    remove(subscribers, userId, subscriber);
  },

  // Гость получает только broadcast
  subscribeGuest(ip: string, subscriber: LiveSubscriber){
    add(guests, ip, subscriber, STREAMS_PER_GUEST_IP);
  },

  unsubscribeGuest(ip: string, subscriber: LiveSubscriber){
    remove(guests, ip, subscriber);
  },

  // Бан: потоки закрываются вместе с сессиями
  closeUser(userId: number){
    const list = subscribers.get(userId) ?? [];
    subscribers.delete(userId);
    list.forEach(closeQuietly);
  },
};

function chunk(type: LiveEventType, data: unknown){
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sendAll<K>(map: Map<K, LiveSubscriber[]>, key: K, message: string){
  for(const subscriber of [ ...(map.get(key) ?? []) ]){
    try{
      subscriber.send(message);
    }
    catch{
      // Поток закрыт — действие не роняем, подписчика снимаем
      remove(map, key, subscriber);
    }
  }
}

function add<K>(map: Map<K, LiveSubscriber[]>, key: K, subscriber: LiveSubscriber, max: number){
  const list = map.get(key) ?? [];
  list.push(subscriber);
  map.set(key, list);

  while(list.length > max){
    closeQuietly(list.shift()!);
  }
}

function remove<K>(map: Map<K, LiveSubscriber[]>, key: K, subscriber: LiveSubscriber){
  const list = (map.get(key) ?? []).filter(s => s !== subscriber);

  if(list.length > 0){
    map.set(key, list);
  }
  else{
    map.delete(key);
  }
}

function closeQuietly(subscriber: LiveSubscriber){
  try{
    subscriber.close();
  }
  catch{
    // уже закрыт
  }
}
