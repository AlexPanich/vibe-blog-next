import 'server-only';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/database/schema';
import { databaseConfig } from '@/config/database';

export function initClient(path: string){
  const sqlite = new Database(path);
  registerFunctions(sqlite);
  return drizzle(sqlite, { schema });
}

/* Никакого DI, делаем в духе Next.js на пофиг :)) */
export const db = initClient(databaseConfig.path);

export type DBClient = typeof db;

/*
  lower() и ORDER BY в SQLite работают с кириллицей побайтово. Эти функции живут только
  в нашем соединении: drizzle-kit и MCP sql-dev их не знают — в миграциях не использовать
*/
function registerFunctions(sqlite: Database.Database){
  // Регистронезависимый поиск: lower_ru(title) LIKE ?
  sqlite.function('lower_ru', { deterministic: true }, (value: unknown) => {
    return typeof value === 'string' ? value.toLocaleLowerCase('ru') : value;
  });

  // Ключ алфавитной сортировки: ещё и ё → е, иначе «Ёжик» уехал бы после «Яна»
  sqlite.function('sort_ru', { deterministic: true }, (value: unknown) => {
    return typeof value === 'string' ? value.toLocaleLowerCase('ru').replaceAll('ё', 'е') : value;
  });
}
