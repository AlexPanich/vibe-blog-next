/*
  День просмотра (спека 43) — 'YYYY-MM-DD' по часам сервера, как дни у followerStats: столбики
  рисует сервер, пояса браузера он не знает. Не toISOString — это UTC
*/
export function viewDay(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

// День со сдвигом на delta суток; через setDate, чтобы переход на летнее время не терял день
export function shiftDay(day: string, delta: number){
  return viewDay(dayDate(day, delta));
}

// Полночь дня по часам сервера
export function dayDate(day: string, delta = 0){
  const [ y, m, d ] = day.split('-').map(Number);

  return new Date(y, m - 1, d + delta);
}
