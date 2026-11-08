import { dayDiff } from "@/shared/localDays";

/*
  Даты мессенджера — только в браузере (часовой пояс читателя), на сервере не вызывать:
  компоненты показывают их после гидрации
*/

// Время в списке переписок: сегодня — «14:20», вчера — «вчера», на неделе — «пн», раньше — «3 нояб.»
export function shortWhen(value: Date, now = new Date()): string {
  const days = dayDiff(value, now);

  if(days === 0){
    return value.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  }
  else if(days === 1){
    return 'вчера';
  }
  else if(days < 7){
    return value.toLocaleDateString('ru', { weekday: 'short' });
  }

  return value.toLocaleDateString('ru', value.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

// Разделитель дней в диалоге: «Сегодня», «Вчера», «5 ноября»
export function dayLabel(value: Date, now = new Date()): string {
  const days = dayDiff(value, now);

  if(days === 0){
    return 'Сегодня';
  }
  else if(days === 1){
    return 'Вчера';
  }

  return value.toLocaleDateString('ru', value.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
}

export function sameDay(a: Date, b: Date): boolean {
  return dayDiff(a, b) === 0;
}

