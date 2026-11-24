import 'client-only';
import { readNdjson } from "@/core/ndjson";
import { postAskEventResource, type PostAskSourceResource } from "@/domains/posts/dto/postAskResources";
import { useEffect, useRef, useState } from "react";

export type PostAskPhase = 'idle' | 'searching' | 'answering' | 'done' | 'stopped' | 'failed';

export type PostAskState = {
  phase: PostAskPhase,
  question: string,
  sources: PostAskSourceResource[],
  text: string,
  error: string | null
}

const FAILED = 'Не удалось получить ответ';

const INITIAL: PostAskState = { phase: 'idle', question: '', sources: [], text: '', error: null };

/*
  Вопрос к /api/ask и NDJSON-поток ответа (спека 57, п. 2, 11, 15, план 57, шаг 8). Новый вопрос
  прерывает прошлый и сбрасывает его ответ; stop() и размонтирование обрывают fetch — сервер
  обрывает генерацию. Отказ до потока приходит статусом и JSON { message }
*/
export default function usePostAsk(){
  const [ state, setState ] = useState<PostAskState>(INITIAL);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  async function ask(question: string){
    controller.current?.abort();

    const abort = new AbortController();

    controller.current = abort;
    setState({ phase: 'searching', question, sources: [], text: '', error: null });

    const update = (change: Partial<PostAskState>) => {
      if(controller.current === abort){
        setState(prev => ({ ...prev, ...change }));
      }
    };

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: abort.signal
      });

      if(!response.ok || !response.body){
        update({ phase: 'failed', error: await errorMessage(response) });

        return;
      }

      let text = '';

      for await (const value of readNdjson(response.body)){
        const event = postAskEventResource.parse(value);

        if(event.type === 'sources'){
          update({ phase: 'answering', sources: event.posts });
        }
        else if(event.type === 'delta'){
          text += event.text;
          update({ text });
        }
        else if(event.type === 'done'){
          update({ phase: 'done' });
        }
        else{
          update({ phase: 'failed', error: event.message });
        }
      }

      // Поток закрылся без done и error — оборвался
      setState(prev => controller.current === abort && prev.phase === 'answering' ? { ...prev, phase: 'failed', error: FAILED } : prev);
    }
    catch{
      if(!abort.signal.aborted){
        update({ phase: 'failed', error: FAILED });
      }
    }
  }

  function stop(){
    controller.current?.abort();
    controller.current = null;
    setState(prev => prev.phase === 'searching' || prev.phase === 'answering' ? { ...prev, phase: 'stopped' } : prev);
  }

  return { ...state, ask, stop, busy: state.phase === 'searching' || state.phase === 'answering' };
}

async function errorMessage(response: Response){
  try {
    const body = await response.json() as { message?: unknown };

    return typeof body.message === 'string' ? body.message : FAILED;
  }
  catch{
    return FAILED;
  }
}
