/*
  Правила текста для помощника автора (спека 55, п. 3): нужны и клиенту (кнопка неактивна с
  подсказкой), и action. Без 'server-only'
*/
import { plainText } from "@/domains/posts/shared/postText";

export type PostAssistKind = 'title' | 'lead' | 'tags' | 'style' | 'route'

// Минимум плоского текста: стилю хватает пары фраз, остальным — пары абзацев
export const ASSIST_MIN_PLAIN = 200;

export const ASSIST_MIN_PLAIN_STYLE = 20;

export const ASSIST_MAX_MARKDOWN = 30_000;

// Сколько оставляем после фильтров; quote — длина цитаты замечания о стиле
export const POST_ASSIST_LIMITS = { titles: 3, leads: 2, tags: 5, issues: 20, quote: 300 };

// Причина, по которой помощник не возьмёт текст, или null
export function assistTextProblem(kind: PostAssistKind, content: string): string | null {
  if(content.length > ASSIST_MAX_MARKDOWN){
    return 'Текст слишком длинный для помощника';
  }

  const min = kind === 'style' ? ASSIST_MIN_PLAIN_STYLE : ASSIST_MIN_PLAIN;

  return plainText(content).length < min ? minHint(kind) : null;
}

// Непересекающиеся вхождения; пустая строка — 0
export function countOccurrences(text: string, part: string): number {
  if(part === ''){
    return 0;
  }

  let count = 0;
  let from = text.indexOf(part);

  while(from !== -1){
    count++;
    from = text.indexOf(part, from + part.length);
  }

  return count;
}

function minHint(kind: PostAssistKind){
  return kind === 'style' ? 'Напишите хотя бы пару фраз' : 'Напишите хотя бы пару абзацев';
}
