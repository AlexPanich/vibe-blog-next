'use client'

import 'client-only';
import ClientValue from "@/components/general/ClientValue";
import LocalDate from "@/components/general/LocalDate";

type PostSavedAtProps = {
  value: Date
}

/*
  «Сохранено 14:32» — сегодня, «Сохранено 3 нояб., 14:32» — раньше (спека 49). «Сегодня ли»
  зависит от часов браузера, поэтому формат выбирается после гидрации
*/
export default function PostSavedAt({ value }: PostSavedAtProps) {
  return <>
    Сохранено <ClientValue
      server={<LocalDate value={value} options={EARLIER} />}
      client={() => <LocalDate value={value} options={isToday(value) ? TODAY : EARLIER} />}
    />
  </>;
}

const TODAY: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
const EARLIER: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

function isToday(value: Date){
  return value.toDateString() === new Date().toDateString();
}
