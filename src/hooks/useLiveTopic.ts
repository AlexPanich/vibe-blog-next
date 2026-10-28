import 'client-only';
import { LiveEventsContext } from "@/contexts/LiveEventsContext";
import type { LiveTopic } from "@/shared/liveEvents";
import { useContext, useEffect } from "react";

/*
  Тема живого канала, пока компонент на странице (спека 29): события поста приходят только
  тем, кто его смотрит. Сами события — через useLiveEvent. Несколько компонентов с одной
  темой — одна тема в потоке
*/
export default function useLiveTopic(topic: LiveTopic){
  const { watch } = useContext(LiveEventsContext);

  useEffect(() => watch(topic), [ watch, topic ]);
}
