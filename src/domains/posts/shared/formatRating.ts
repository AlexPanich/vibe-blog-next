/*
  «4,2»: всегда одна цифра после запятой, локаль фиксирована — сервер и клиент печатают одинаково
*/
export function formatRating(average: number){
  return average.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function ratingsCountLabel(count: number){
  const mod10 = count % 10;
  const mod100 = count % 100;

  if(mod10 === 1 && mod100 !== 11){
    return `${count} оценка`;
  }
  else if(mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)){
    return `${count} оценки`;
  }

  return `${count} оценок`;
}
