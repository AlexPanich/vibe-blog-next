import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { count } from "drizzle-orm";
import * as schema from "../src/database/schema.ts";
import { databaseConfig } from "../src/config/database.ts";
import { uploadsConfig } from "../src/config/uploads.ts";
import { people } from "./seed-demo/people.ts";
import { demoPosts } from "./seed-demo/posts.ts";
import { buildSeedImages, copySeedImages } from "./seed-demo/images.ts";
import { fillDemo } from "./seed-demo/fill.ts";

/*
  Демо-данные для пустой базы (docker/entrypoint.sh, npm run db:seed) — тот же контент, что
  у dev-сида: 20 пользователей с аватарами, посты всех типов и статусов с фото, комментарии,
  жалобы, подписки, сообщения, заявки в авторы. База уже не пустая — ничего не делает: на
  своём сервере сид не затрёт живые данные.

  Картинки: в Docker они собраны при сборке образа (scripts/seed-images.ts → SEED_IMAGES_DIR)
  и только копируются — старт не ждёт скачивания и sharp. Без готовых — скачиваются в
  storage/seed-photos/ и режутся на месте.
  Запускается голым node — импорты относительные, без '@/'
*/

const PREBUILT = process.env.SEED_IMAGES_DIR ?? './seed-images';
const CACHE = './storage/seed-photos';

const sqlite = new Database(databaseConfig.path);
const db = drizzle(sqlite, { schema });
const [ { n } ] = db.select({ n: count() }).from(schema.users).all();

if(n > 0){
  console.log('seed skipped: database is not empty');
  process.exit(0);
}

const images = copySeedImages(PREBUILT, uploadsConfig.dir) ?? await buildSeedImages(uploadsConfig.dir, CACHE);

fillDemo(db, images);

console.log(`seed done: ${people.length} users, ${demoPosts.length} posts, ${Object.keys(images.photos).length} photos`);
