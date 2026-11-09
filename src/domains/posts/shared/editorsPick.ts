// Выбор редакции действует 7 дней с момента выбора (спека 39, п. 2)
export const EDITORS_PICK_DAYS = 7;

// Метка большого поста на главной: ручной выбор, лучшая оценка недели или без метки
export type HomePick = 'editor' | 'week' | null;

const DAY_MS = 24 * 60 * 60 * 1000;

/*
  Выбран ли пост сейчас. Протухший выбор колонку не обнуляет (крона нет) — такой пост
  просто считается невыбранным, следующий выбор обнулит его как любой прежний
*/
export function featuredNow(featuredAt: Date | null, now = Date.now()){
  return featuredAt !== null && now - featuredAt.getTime() < EDITORS_PICK_DAYS * DAY_MS;
}

// Граница: выбор раньше неё протух
export function editorsPickSince(now = Date.now()){
  return new Date(now - EDITORS_PICK_DAYS * DAY_MS);
}

// До какого момента пост на главной
export function editorsPickUntil(featuredAt: Date){
  return new Date(featuredAt.getTime() + EDITORS_PICK_DAYS * DAY_MS);
}
