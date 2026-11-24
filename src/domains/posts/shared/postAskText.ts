/*
  Ответ модели на экране (спека 57, п. 9–10, план 57, реш. 13): абзацы и сноски [n]. Без
  'server-only' — чистая функция, разбирает и печатающийся текст
*/

export type AskSegment = { kind: 'text', text: string } | { kind: 'ref', n: number };

export type AskAnswer = {
  paragraphs: AskSegment[][],
  // Номера источников в порядке первого упоминания
  cited: number[]
}

// [1], [1, 2], [1][2] — группа сносок подряд. Незакрытая [ не совпадает и остаётся текстом
const REF_GROUP = /(?:\[\s*\d+(?:\s*[,;]\s*\d+)*\s*\])+/g;

/*
  Модель могла ослушаться промпта: URL и markdown-разметка вырезаются, номера вне 1..count —
  тоже. Ссылки на экране рождаются только из сносок
*/
export function parseAskAnswer(text: string, count: number): AskAnswer {
  const cited: number[] = [];
  const paragraphs = clean(text)
    .split(/\n{2,}/)
    .map(paragraph => paragraph.replace(/[ \t]*\n[ \t]*/g, ' ').trim())
    .filter(Boolean)
    .map(paragraph => segments(paragraph, count, cited))
    .filter(paragraph => paragraph.length > 0);

  return { paragraphs, cited };
}

function segments(paragraph: string, count: number, cited: number[]){
  const result: AskSegment[] = [];
  let last = 0;

  for(const match of paragraph.matchAll(REF_GROUP)){
    pushText(result, paragraph.slice(last, match.index));
    last = match.index + match[0].length;

    const numbers = [ ...new Set((match[0].match(/\d+/g) ?? []).map(Number)) ]
      .filter(n => n >= 1 && n <= count);

    for(const n of numbers){
      result.push({ kind: 'ref', n });

      if(!cited.includes(n)){
        cited.push(n);
      }
    }
  }

  pushText(result, paragraph.slice(last));

  return result;
}

// Пробелы, оставшиеся от вырезанных сносок, сворачиваются
function pushText(result: AskSegment[], text: string){
  const value = text.replace(/ {2,}/g, ' ');
  const prev = result.at(-1);

  if(!value || (result.length === 0 && !value.trim())){
    return;
  }

  if(prev?.kind === 'text'){
    prev.text = (prev.text + value).replace(/ {2,}/g, ' ');
  }
  else{
    result.push({ kind: 'text', text: value });
  }
}

function clean(text: string){
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bwww\.\S+/gi, '')
    .replace(/\*\*|__/g, '')
    .replace(/^[ \t]*#{1,6}[ \t]*/gm, '');
}
