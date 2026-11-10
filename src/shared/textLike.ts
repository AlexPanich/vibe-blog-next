import { sql, type SQL, type AnyColumn } from "drizzle-orm";
import { escapeLike } from "@/shared/escapeLike";

// Подстрока без регистра: lower() в SQLite кириллицу не понижает — lower_ru из globals/db.ts
export function textLike(column: AnyColumn | SQL, q: string): SQL {
  return sql`lower_ru(${column}) LIKE ${likePattern(q)} ESCAPE '\\'`;
}

// '%подстрока%' для сырого SQL (подзапросы с алиасами)
export function likePattern(q: string): string {
  return `%${escapeLike(q.toLocaleLowerCase('ru'))}%`;
}
