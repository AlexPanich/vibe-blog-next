// Ссылка «Где почитать ваши тексты» в заявке в авторы (спека 48)
export const AUTHOR_REQUEST_LINK_MAX = 300;

export const AUTHOR_REQUEST_LINK_ERROR = 'Укажите ссылку на сайт, например t.me/name';

/*
  Результат: { link: null } — поле пустое; { error } — текст ошибки поля; { link } — что хранить.
  Схемы нет — дописываем https://. Хранится строка пользователя, а не url.href: href перевёл бы
  кириллический домен в punycode и дописал бы «/». new URL только проверяет
*/
export function normalizeAuthorRequestLink(value: string): { link: string | null } | { error: string } {
  const trimmed = value.trim();

  if(trimmed === ''){
    return { link: null };
  }

  if(/\s/.test(trimmed)){
    return { error: AUTHOR_REQUEST_LINK_ERROR };
  }

  const cleaned = cleanSlashes(trimmed);
  const link = hasScheme(cleaned) ? cleaned : `https://${cleaned}`;
  const url = parseUrl(link);

  if(!url || (url.protocol !== 'http:' && url.protocol !== 'https:') || !isSiteHost(url.hostname)){
    return { error: AUTHOR_REQUEST_LINK_ERROR };
  }

  if(link.length > AUTHOR_REQUEST_LINK_MAX){
    return { error: `Не больше ${AUTHOR_REQUEST_LINK_MAX} символов` };
  }

  return { link };
}

// https://www.t.me/hiker/ → t.me/hiker: без схемы, www. и завершающего /
export function authorRequestLinkLabel(link: string): string {
  return link.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
}

// //evil.com → evil.com, https:example.com и https:///example.com → https://example.com:
// иначе в базе и в подписи остался бы мусор из слешей
function cleanSlashes(value: string): string {
  return value.replace(/^\/+/, '').replace(/^(https?):\/*/i, '$1://');
}

// После двоеточия цифра — это порт (example.com:8080), а не схема
function hasScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:(?!\d)/i.test(value);
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  }
  catch {
    return null;
  }
}

function isSiteHost(hostname: string): boolean {
  return hostname.includes('.') && !hostname.startsWith('.') && !hostname.endsWith('.');
}
