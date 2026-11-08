/*
  Календарные дни по местному времени — только в браузере (часовой пояс читателя): компоненты
  показывают такие даты после гидрации
*/

// Сегодня — «2 часа назад», вчера — «вчера, 21:14», раньше — «2 нояб.»; по часам браузера
export function formatWhen(value: Date): string {
  const days = dayDiff(value);

  if(days === 0){
    const minutes = Math.round((Date.now() - value.getTime()) / 60_000);
    const format = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });

    return minutes < 1 ? 'только что' : minutes < 60 ? format.format(-minutes, 'minute') : format.format(-Math.floor(minutes / 60), 'hour');
  }
  else if(days === 1){
    return `вчера, ${value.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return value.toLocaleDateString('ru', value.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

// Сколько календарных дней между value и now: 0 — сегодня, 1 — вчера
export function dayDiff(value: Date, now = new Date()): number {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  return Math.round((start(now) - start(value)) / 86_400_000);
}
