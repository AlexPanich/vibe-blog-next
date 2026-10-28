import type { Tag } from "@/database/types";

/*
  Ключ уникальности названия. Регистр меняем в JS: lower() в SQLite не трогает кириллицу
*/
export function tagNameKey(name: string){
  return name.trim().toLocaleLowerCase('ru');
}

/*
  По алфавиту: ORDER BY в SQLite сравнивает байты, и «Ёлки» уехали бы в конец
*/
export function sortTags<T extends Pick<Tag, 'name'>>(tags: T[]): T[] {
  return [ ...tags ].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}
