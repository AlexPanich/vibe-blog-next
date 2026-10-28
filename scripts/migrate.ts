import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { databaseConfig } from "../src/config/database.ts";

/*
  Миграции при старте контейнера (docker/entrypoint.sh). Запускается голым node, как
  queue-runner.ts: импорты относительные, без '@/' и 'server-only'.
  better-sqlite3 не создаёт каталог базы — создаём сами
*/
mkdirSync('./storage/uploads', { recursive: true });

const sqlite = new Database(databaseConfig.path);

migrate(drizzle(sqlite), { migrationsFolder: './drizzle' });
sqlite.close();

console.log('migrations applied');
