'use client'

import 'client-only';
import { Button, CloseButton, Skeleton } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { ReactNode } from "react";

type PostAssistPanelProps = {
  title: string,
  pending: boolean,
  error: string | undefined,
  // Ответ пришёл, но после фильтров пуст — это не ошибка (п. 8)
  empty: boolean,
  emptyText: string,
  onRetry: () => void,
  onClose: () => void,
  children?: ReactNode
}

/*
  Блок результата под полем (спека 55, п. 12): заголовок функции, «Скрыть», тело по состоянию —
  «Думаю…», ошибка с «Повторить», пусто или children — и строка-напоминание внизу
*/
export default function PostAssistPanel({ title, pending, error, empty, emptyText, onRetry, onClose, children }: PostAssistPanelProps){
  return (
    <section className="ui-assist" aria-live="polite" aria-busy={pending}>
      <div className="ui-assist__head">
        <span className="ui-assist__title"><IconSparkles size={15} /> { title }</span>
        <CloseButton size="sm" aria-label="Скрыть" title="Скрыть" onClick={onClose} />
      </div>
      <div className="ui-assist__body">
        { body() }
      </div>
      <p className="ui-assist__foot">Предложения ИИ — проверьте перед сохранением</p>
    </section>
  );

  function body(){
    if(pending){
      return <>
        <p className="ui-assist__state">Думаю…</p>
        <Skeleton height={12} radius="xl" />
        <Skeleton height={12} radius="xl" width="80%" />
        <Skeleton height={12} radius="xl" width="60%" />
      </>;
    }
    else if(error){
      return <div className="ui-assist__error">
        <p className="ui-assist__state" data-tone="error" role="alert">{ error }</p>
        <Button type="button" variant="default" size="compact-sm" onClick={onRetry}>Повторить</Button>
      </div>;
    }
    else if(empty){
      return <p className="ui-assist__state">{ emptyText }</p>;
    }

    return children;
  }
}
