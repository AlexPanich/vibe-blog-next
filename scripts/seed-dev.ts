import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { inArray, notInArray } from "drizzle-orm";
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import * as schema from "../src/database/schema.ts";
import { databaseConfig } from "../src/config/database.ts";
import { uploadsConfig } from "../src/config/uploads.ts";
import { people } from "./seed-demo/people.ts";
import { demoPosts } from "./seed-demo/posts.ts";
import { buildSeedImages } from "./seed-demo/images.ts";
import { fillDemo } from "./seed-demo/fill.ts";

/*
  Наполненная dev-база — тот же контент, что у прод-сида (seed-demo/fill.ts), но поверх
  существующей базы.

  ЗАТИРАЕТ контент dev-базы: посты, комментарии, рубрики, уведомления, сообщения — всё,
  кроме учёток. Пользователи из seed-demo/people.ts остаются или создаются (пароль у новых —
  password123), остальные удаляются. Перед запуском база копируется в storage/.

  Фото скачиваются один раз в storage/seed-photos/. Запуск: npm run db:seed-dev
*/

const CACHE = './storage/seed-photos';

if(process.env.NODE_ENV === 'production' || !databaseConfig.path.endsWith('dev.db')){
  console.error('seed-dev: только для dev.db');
  process.exit(1);
}

const sqlite = new Database(databaseConfig.path);
const backup = `${databaseConfig.path}.bak-seed-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
await sqlite.backup(backup);
console.log(`backup: ${backup}`);

// Файлы — до транзакции: better-sqlite3 не ждёт промисов внутри transaction()
const images = await buildSeedImages(uploadsConfig.dir, CACHE);
const db = drizzle(sqlite, { schema });
const keepEmails = people.map(p => p.email);

db.transaction(tx => {
  // Порядок неважен: PRAGMA foreign_keys в проекте выключен
  for(const table of [
    schema.notifications, schema.messages, schema.dialogs, schema.messageRestrictions, schema.messageIgnores,
    schema.commentReports, schema.commentReactions, schema.commentModerations, schema.comments,
    schema.postRatings, schema.postFavorites, schema.postTags, schema.postImages, schema.postModerations, schema.posts,
    schema.tagFollows, schema.tags, schema.userFollows, schema.userBlocks, schema.authorRequests, schema.userAdminActions,
  ]){
    tx.delete(table).run();
  }

  const stale = tx.select({ id: schema.users.id }).from(schema.users).where(notInArray(schema.users.email, keepEmails)).all().map(r => r.id);

  if(stale.length > 0){
    tx.delete(schema.sessions).where(inArray(schema.sessions.userId, stale)).run();
    tx.delete(schema.accounts).where(inArray(schema.accounts.userId, stale)).run();
    tx.delete(schema.users).where(inArray(schema.users.id, stale)).run();
  }
});

fillDemo(db, images);

// Старые загрузки больше никто не держит — подчищаем всё, кроме только что созданного
const fresh = new Set([ ...Object.values(images.avatars), ...Object.values(images.covers ?? {}), ...Object.values(images.photos).map(f => f.key) ]);
let removed = 0;

for(const file of readdirSync(uploadsConfig.dir)){
  if(!fresh.has(file.replace(/-\d+\.webp$/, ''))){
    rmSync(path.join(uploadsConfig.dir, file));
    removed++;
  }
}

console.log(`seed-dev done: ${people.length} users, ${demoPosts.length} posts, ${Object.keys(images.photos).length} photos; removed ${removed} stale uploads`);
