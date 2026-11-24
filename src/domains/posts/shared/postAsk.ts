/*
  «Спросить блог» (спека 57): общее у формы и route. Без 'server-only' — нужно и клиенту
*/
import { feedUrl } from "@/domains/posts/shared/feedUrl";

// Длина вопроса после trim (п. 4)
export const ASK_MIN = 5;

export const ASK_MAX = 300;

// Лента режет search до 100 символов (postFeedFilterDto), длиннее — ссылка открыла бы ленту без поиска
const FEED_SEARCH_MAX = 100;

/*
  Примеры-чипы под полем (п. 3, план 57, реш. 16): по темам демо-постов, каждый находит хотя бы
  один источник
*/
export const ASK_EXAMPLES = [
  'Где вкусно поесть в Тбилиси и Ереване?',
  'Как собрать рюкзак в поход на неделю?',
  'Куда сходить на байдарке на несколько дней?'
];

// Лента с поиском по вопросу — под ответом «В блоге пока нет историй об этом» (п. 6, реш. 7)
export function askFeedHref(question: string){
  return feedUrl({ search: question.trim().slice(0, FEED_SEARCH_MAX).trim() });
}
