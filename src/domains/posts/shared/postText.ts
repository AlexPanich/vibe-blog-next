/*
  Текст поста для карточек и мета-строки: выдержка и время чтения считаются из markdown,
  не хранятся (спека 30). Без 'server-only' — понадобится и странице поста
*/

const WORDS_PER_MINUTE = 200;

const EXCERPT_LENGTH = 160;

// Markdown → плоский текст: код, картинки и html выбрасываются, у ссылок остаётся текст
export function plainText(markdown: string){
  return markdown
    .replace(/```[\s\S]*?(```|$)/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, '')
    .replace(/[*_~`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Обрезка по границе слова; короткий текст — как есть
export function postExcerpt(markdown: string, length = EXCERPT_LENGTH){
  return cutWords(plainText(markdown), length);
}

// Обрезка плоского текста по границе слова с «…»; короткий — как есть
export function cutWords(text: string, length: number){
  if(text.length <= length){
    return text;
  }

  const cut = text.slice(0, length);
  const space = cut.lastIndexOf(' ');

  return `${(space > length * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?—-]+$/, '')}…`;
}

// Подзаголовок поста (спека 35), а без него — выдержка из текста: лента, OG, RSS
export function postSummary(post: { lead: string | null, content: string }, length = EXCERPT_LENGTH){
  return post.lead ?? postExcerpt(post.content, length);
}

// Минуты чтения, не меньше одной
export function readingMinutes(markdown: string){
  const words = plainText(markdown).split(' ').filter(Boolean).length;

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
