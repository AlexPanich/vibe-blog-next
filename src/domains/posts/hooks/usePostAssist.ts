import 'client-only';
import type { ActionServerError } from "@/globals/actionClient";
import type { postAssistDto, PostAssistDto } from "@/domains/posts/dto/postAssistRequests";
import { useAction } from "next-safe-action/hooks";
import type { SingleInputActionFn } from "next-safe-action/hooks";
import { useState } from "react";

/*
  Состояние одной функции помощника (план 55, реш. 15). run открывает блок и шлёт запрос; close
  прячет блок, но запрос не отменяет. execute — только из обработчиков клика, без useEffect.
  runs — номер запуска: ключ блока, новый результат сбрасывает его отметки «применено»
*/
export default function usePostAssist<ShapedErrors, Data>(action: SingleInputActionFn<ActionServerError, typeof postAssistDto, ShapedErrors, Data>){
  const [ open, setOpen ] = useState(false);
  const [ runs, setRuns ] = useState(0);
  const { execute, isPending, result } = useAction(action);
  // Блок показывает одно сообщение; не прошла форма входа — сломан клиент (реш. 5 плана)
  const error = result.serverError?.message
    ?? (result.validationErrors ? 'Не удалось прочитать форму — обновите страницу' : undefined);

  function run(input: PostAssistDto){
    setOpen(true);
    setRuns(n => n + 1);
    execute(input);
  }

  return {
    open,
    pending: isPending,
    data: isPending ? undefined : result.data,
    error: isPending ? undefined : error,
    runs,
    run,
    close: () => setOpen(false)
  };
}

export type PostAssistState<Data> = {
  open: boolean,
  pending: boolean,
  data: Data | undefined,
  error: string | undefined,
  runs: number,
  run: (input: PostAssistDto) => void,
  close: () => void
}
