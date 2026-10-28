'use client';

import 'client-only';
import { LiveEventsContext, type LiveEventsContextType, type LiveHandlers } from "@/contexts/LiveEventsContext";
import useUser from "@/hooks/useUser";
import { LIVE_BROADCAST_EVENT_TYPES, LIVE_EVENT_TYPES, type LiveTopic } from "@/shared/liveEvents";
import { useEffect, useMemo, useRef, useState } from "react";

type Handler = (data?: unknown) => void;

/*
  Один EventSource на вкладку. У вошедшего открыт всегда, у гостя — пока на странице есть
  подписчик широковещательного события (спека 22) или тема (спека 29): иначе каждая вкладка
  гостя держала бы соединение зря. Вход, выход и смена тем переоткрывают поток.
  Переподключение — штатное EventSource, после каждого open подписчики перечитывают своё
  состояние
*/
export default function LiveEventsProvider({ children }: { children: React.ReactNode }){
  const { user, ready } = useUser();
  const handlers = useRef(new Map<keyof LiveHandlers, Set<Handler>>());
  const [ broadcastSubscribers, setBroadcastSubscribers ] = useState(0);
  // Тема → число компонентов, которые её держат
  const [ watched, setWatched ] = useState<ReadonlyMap<LiveTopic, number>>(new Map());
  const topics = [ ...watched.keys() ].sort().join(',');
  // Ключ потока: id пользователя, 'guest' или null — поток закрыт
  const stream = !ready ? null : user?.id ?? (broadcastSubscribers > 0 || topics ? 'guest' : null);

  const context = useMemo<LiveEventsContextType>(() => ({
    subscribe(type, handler){
      const set = handlers.current.get(type) ?? new Set();
      const broadcast = (LIVE_BROADCAST_EVENT_TYPES as readonly string[]).includes(type);
      set.add(handler as Handler);
      handlers.current.set(type, set);

      if(broadcast){
        setBroadcastSubscribers(n => n + 1);
      }

      return () => {
        set.delete(handler as Handler);

        if(broadcast){
          setBroadcastSubscribers(n => n - 1);
        }
      };
    },

    watch(topic){
      setWatched(prev => withCount(prev, topic, 1));

      return () => setWatched(prev => withCount(prev, topic, -1));
    }
  }), []);

  useEffect(() => {
    if(stream === null){
      return;
    }

    const source = new EventSource(topics ? `/api/events?topics=${topics}` : '/api/events');
    const dispatch = (type: keyof LiveHandlers, data?: unknown) => handlers.current.get(type)?.forEach(handler => handler(data));

    source.addEventListener('open', () => dispatch('open'));

    for(const type of LIVE_EVENT_TYPES){
      source.addEventListener(type, event => {
        try{
          dispatch(type, JSON.parse((event as MessageEvent<string>).data));
        }
        catch(e){
          console.error('Live event error:', e);
        }
      });
    }

    return () => source.close();
  }, [ stream, topics ]);

  return <LiveEventsContext value={context}>
    { children }
  </LiveEventsContext>
}

function withCount(map: ReadonlyMap<LiveTopic, number>, topic: LiveTopic, delta: number){
  const next = new Map(map);
  const count = (next.get(topic) ?? 0) + delta;

  if(count > 0){
    next.set(topic, count);
  }
  else{
    next.delete(topic);
  }

  return next;
}
