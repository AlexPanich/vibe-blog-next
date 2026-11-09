// Обрезка плоского текста по границе слова с «…»; короткий — как есть
export function cutWords(text: string, length: number){
  if(text.length <= length){
    return text;
  }

  const cut = text.slice(0, length);
  const space = cut.lastIndexOf(' ');

  return `${(space > length * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?—-]+$/, '')}…`;
}
