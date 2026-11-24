/*
  Цитаты из ответа модели и разметка промпта: общее у разбора модерации (спека 54) и помощника
  автора (спека 55). Без 'server-only' — функции чистые
*/

/*
  Цитата должна дословно встречаться в тексте (спека 54, п. 8) — после нормализации: пробелы,
  регистр, типографские кавычки и тире, ё
*/
export function quoteFound(quote: string, haystacks: string[]){
  const needle = normalizeQuote(quote);

  return haystacks.some(h => normalizeQuote(h).includes(needle));
}

// Индекс цитаты в нормализованном тексте или −1: по нему — порядок мест в тексте
export function quotePosition(quote: string, haystack: string){
  return normalizeQuote(haystack).indexOf(normalizeQuote(quote));
}

export function normalizeQuote(text: string){
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»“”„"]/g, '"')
    .replace(/[‘’‚']/g, "'")
    .replace(/[—–−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cutText(text: string, length: number){
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}

// Закрывающий тег внутри текста поста не должен закрывать разметку промпта
export function escapePromptTags(text: string, tags: string[]){
  return text.replace(new RegExp(`</(${tags.join('|')})>`, 'gi'), '</ $1>');
}
