import 'client-only';
import type { LiveEvents, LiveEventType, LiveTopic } from "@/shared/liveEvents";
import { createContext } from "react";

// open — поток (пере)подключился: события, пришедшие в разрыв, потеряны, состояние перечитать
export type LiveHandlers = { [K in LiveEventType]: (data: LiveEvents[K]) => void } & { open: () => void };

// Напрямую не читать — только через useLiveEvent() / useLiveTopic()
export type LiveEventsContextType = {
  subscribe: <K extends keyof LiveHandlers>(type: K, handler: LiveHandlers[K]) => () => void,
  // Тема открытой страницы: поток переоткрывается с ней (спека 29)
  watch: (topic: LiveTopic) => () => void
}

export const LiveEventsContext = createContext<LiveEventsContextType>({
  subscribe: () => () => {},
  watch: () => () => {}
});
