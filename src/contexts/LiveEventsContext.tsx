import 'client-only';
import type { LiveEvents, LiveEventType } from "@/shared/liveEvents";
import { createContext } from "react";

// open — поток (пере)подключился: события, пришедшие в разрыв, потеряны, состояние перечитать
export type LiveHandlers = { [K in LiveEventType]: (data: LiveEvents[K]) => void } & { open: () => void };

// Напрямую не читать — только через useLiveEvent()
export type LiveEventsContextType = {
  subscribe: <K extends keyof LiveHandlers>(type: K, handler: LiveHandlers[K]) => () => void
}

export const LiveEventsContext = createContext<LiveEventsContextType>({
  subscribe: () => () => {}
});
