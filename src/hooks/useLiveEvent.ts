import 'client-only';
import { LiveEventsContext, type LiveHandlers } from "@/contexts/LiveEventsContext";
import { useContext, useEffect, useRef } from "react";

// Подписка компонента на событие живого канала. handler может меняться на каждом рендере
export default function useLiveEvent<K extends keyof LiveHandlers>(type: K, handler: LiveHandlers[K]){
  const { subscribe } = useContext(LiveEventsContext);
  const latest = useRef(handler);

  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    return subscribe(type, ((...args: unknown[]) => (latest.current as (...a: unknown[]) => void)(...args)) as LiveHandlers[K]);
  }, [ subscribe, type ]);
}
