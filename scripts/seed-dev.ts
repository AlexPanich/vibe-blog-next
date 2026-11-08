import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, inArray, notInArray } from "drizzle-orm";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as schema from "../src/database/schema.ts";
import { databaseConfig } from "../src/config/database.ts";
import { people, tags } from "./seed-dev/people.ts";
import { anyaPosts } from "./seed-dev/posts-anya.ts";
import { otherPosts } from "./seed-dev/posts-others.ts";
import { comments as commentTrees } from "./seed-dev/comments.ts";
import type { SeedComment } from "./seed-dev/types.ts";

/*
  Наполненная dev-база: 20 пользователей с аватарами, 12 рубрик, ~40 постов всех типов и
  статусов с фото, ветки комментариев (к постам и к фото, скрытые, удалённые, с жалобами),
  оценки, избранное, подписки, сообщения и уведомления.

  ЗАТИРАЕТ контент dev-базы: посты, комментарии, рубрики, уведомления, сообщения — всё,
  кроме учёток. Пользователи из seed-dev/people.ts остаются или создаются (пароль у новых —
  password123), остальные удаляются. Перед запуском база копируется в storage/.

  Фото — Wikimedia Commons (авторы и лицензии в seed-dev/photos.json), аватары — pravatar.cc.
  Скачиваются один раз в storage/seed-photos/. Запуск: node scripts/seed-dev.ts
*/

const PASSWORD_HASH = '2c5ddde7a24416d978bf9c408a63f70e:9a2eab05d7b39193fd22f60aa9a2683c1fcd4370cc039062421d824be09e045851842dc07d10ca30deb766a4275d0f1de60f1f741836419357e327d13bcbb758';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.now();
const UPLOADS = './storage/uploads';
const CACHE = './storage/seed-photos';
const IMAGE_WIDTHS = [ 1600, 800, 400 ];
const AVATAR_SIZES = [ 256, 64 ];

type Manifest = Record<string, { url: string, author: string, license: string, source: string }[]> & { _avatars: Record<string, string> };

if(process.env.NODE_ENV === 'production' || !databaseConfig.path.endsWith('dev.db')){
  console.error('seed-dev: только для dev.db');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(new URL('./seed-dev/photos.json', import.meta.url), 'utf8')) as Manifest;
const posts = [ ...anyaPosts, ...otherPosts ];
const random = rng(30);

mkdirSync(CACHE, { recursive: true });
mkdirSync(UPLOADS, { recursive: true });

const backup = `${databaseConfig.path}.bak-seed-${new Date(NOW).toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
const sqlite = new Database(databaseConfig.path);
await sqlite.backup(backup);
console.log(`backup: ${backup}`);

// Файлы — до транзакции: better-sqlite3 не ждёт промисов внутри transaction()
const avatarKeys: Record<string, string> = {};

for(const person of people){
  const file = await cached(`avatar-${person.key}.jpg`, manifest._avatars[person.key]);
  avatarKeys[person.key] = await saveSquare(file);
}

const photoFiles = new Map<string, { key: string, width: number, height: number }>();

for(const post of posts){
  for(const [ set, index ] of post.photos){
    const id = `${set}-${index}`;

    if(!photoFiles.has(id)){
      const entry = manifest[set]?.[index];

      if(!entry){
        throw new Error(`нет фото ${id} в photos.json`);
      }

      photoFiles.set(id, await saveVariants(await cached(`${id}.jpg`, entry.url)));
    }
  }
}

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

  // --- Пользователи
  const uid: Record<string, number> = {};

  for(const person of people){
    const createdAt = new Date(person.since);
    const values = { name: person.name, roles: JSON.stringify(person.roles), bio: person.bio, avatarKey: avatarKeys[person.key], bannedAt: null, banReason: null, createdAt };
    const existing = tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, person.email)).get();

    if(existing){
      tx.update(schema.users).set(values).where(eq(schema.users.id, existing.id)).run();
      uid[person.key] = existing.id;
    }
    else{
      uid[person.key] = tx.insert(schema.users)
        .values({ ...values, email: person.email, emailVerified: true, updatedAt: createdAt })
        .returning({ id: schema.users.id })
        .get().id;
      tx.insert(schema.accounts).values({ userId: uid[person.key], accountId: String(uid[person.key]), providerId: 'credential', password: PASSWORD_HASH, createdAt, updatedAt: createdAt }).run();
    }
  }

  const everyone = people.map(p => p.key);
  const readers = [ 'dan', 'eva', 'katya', 'pavel', 'vera', 'gleb', 'mila', 'artem', 'alice' ];

  // --- Рубрики
  const tagId: Record<string, number> = {};

  for(const [ name, slug ] of tags){
    tagId[name] = tx.insert(schema.tags).values({ name, nameKey: name.toLocaleLowerCase('ru'), slug, createdAt: daysAgo(400) }).returning({ id: schema.tags.id }).get().id;
  }

  // --- Посты, фото, модерация
  const postIds: Record<string, { id: number, userId: number, createdAt: number, status: schema.PostStatus, images: number[] }> = {};

  // Старые сначала: id растут вместе с датой, как в живой базе
  for(const post of [ ...posts ].sort((a, b) => b.days - a.days)){
    const status = post.status ?? 'published';
    const created = NOW - post.days * DAY - Math.floor(random() * 10) * HOUR;
    const published = status === 'published' || status === 'hidden' || status === 'blocked';
    const id = tx.insert(schema.posts).values({
      userId: uid[post.author],
      url: post.url,
      title: post.title,
      content: post.content,
      status,
      type: post.type ?? 'simple',
      source: post.source ?? null,
      lat: post.lat ?? null,
      lng: post.lng ?? null,
      createdAt: new Date(created),
      publishedAt: published ? new Date(created + HOUR) : null,
    }).returning({ id: schema.posts.id }).get().id;

    if(post.tags.length > 0){
      tx.insert(schema.postTags).values(post.tags.map(name => ({ postId: id, tagId: tagId[name] }))).run();
    }

    const images = post.photos.map(([ set, index, caption ]) => {
      const file = photoFiles.get(`${set}-${index}`)!;

      return tx.insert(schema.postImages).values({ postId: id, fileKey: file.key, width: file.width, height: file.height, caption: caption ?? null, createdAt: new Date(created) }).returning({ id: schema.postImages.id }).get().id;
    });

    if(published){
      tx.insert(schema.postModerations).values({ postId: id, userId: uid.some, decision: 'approved', createdAt: new Date(created + HOUR) }).run();
    }

    if(status === 'rejected'){
      tx.insert(schema.postModerations).values({ postId: id, userId: uid.some, decision: 'rejected', comment: post.moderation, createdAt: new Date(created + 2 * HOUR) }).run();
      tx.insert(schema.notifications).values({ userId: uid[post.author], type: 'post.rejected', actorId: uid.some, postId: id, createdAt: new Date(created + 2 * HOUR) }).run();
    }

    if(status === 'blocked'){
      tx.insert(schema.postModerations).values({ postId: id, userId: uid.some, decision: 'blocked', comment: post.moderation, createdAt: new Date(created + 3 * HOUR) }).run();
    }

    if(status === 'moderating'){
      for(const staff of [ 'some', 'alice' ]){
        tx.insert(schema.notifications).values({ userId: uid[staff], type: 'post.submitted', actorId: uid[post.author], postId: id, createdAt: new Date(created) }).run();
      }
    }

    postIds[post.url] = { id, userId: uid[post.author], createdAt: created, status, images };
  }

  const publishedPosts = posts.filter(p => (p.status ?? 'published') === 'published');

  // --- Оценки: у «Недели в горах Дагестана» лучшая за неделю — она «Выбор редакции»
  for(const post of publishedPosts){
    const { id, createdAt } = postIds[post.url];
    const base = post.url === 'nedelya-v-gorakh-dagestana' ? 4.85 : 3.6 + random() * 1.2;
    const raters = pick(everyone.filter(k => k !== post.author), 4 + Math.floor(random() * 9));

    tx.insert(schema.postRatings).values(raters.map(key => {
      const at = new Date(Math.min(NOW, createdAt + (1 + random() * 48) * HOUR));

      return { postId: id, userId: uid[key], value: clamp(Math.round(base + (random() - 0.5) * 1.6), 1, 5), createdAt: at, updatedAt: at };
    })).run();

    const fans = pick(readers.filter(k => k !== post.author), Math.floor(random() * 5));

    if(fans.length > 0){
      tx.insert(schema.postFavorites).values(fans.map(key => ({ userId: uid[key], postId: id, createdAt: new Date(createdAt + DAY) }))).run();
    }
  }

  tx.insert(schema.postFavorites).values([ 'nedelya-v-gorakh-dagestana', 'khleb-na-zakvaske', 'peterburg-na-plenku' ]
    .map(url => ({ userId: uid.dan, postId: postIds[url].id, createdAt: daysAgo(0.5) }))).onConflictDoNothing().run();

  // --- Комментарии
  for(const [ url, tree ] of Object.entries(commentTrees)){
    const post = postIds[url];

    for(const node of tree){
      addComment(post, node, null, null);
    }
  }

  function addComment(post: typeof postIds[string], node: SeedComment, parent: { id: number, userId: number } | null, parentImage: number | null){
    const at = new Date(Math.min(NOW - 60_000, post.createdAt + HOUR + node.hours * HOUR));
    const imageIndex = node.image ?? parentImage;
    const id = tx.insert(schema.comments).values({
      postId: post.id,
      userId: uid[node.by],
      parentId: parent?.id ?? null,
      imageId: imageIndex === null ? null : post.images[imageIndex],
      content: node.deleted ? '' : node.text,
      createdAt: at,
      deletedAt: node.deleted ? new Date(at.getTime() + HOUR) : null,
      hiddenAt: node.hidden ? new Date(at.getTime() + 2 * HOUR) : null,
      hiddenBy: node.hidden ? uid.some : null,
      hideReason: node.hidden ?? null,
    }).returning({ id: schema.comments.id }).get().id;

    if(node.hidden){
      tx.insert(schema.commentModerations).values({ commentId: id, userId: uid.some, decision: 'hidden', comment: node.hidden, createdAt: new Date(at.getTime() + 2 * HOUR) }).run();
    }

    for(const [ list, value ] of [ [ node.likes, 1 ], [ node.dislikes, -1 ] ] as const){
      for(const key of list ?? []){
        tx.insert(schema.commentReactions).values({ commentId: id, userId: uid[key], value, createdAt: at }).run();
      }
    }

    // Жалоба приходит через полчаса; скрытый или оставленный — разобраны модератором через два часа
    const resolution = node.hidden ? 'hidden' as const : node.reportsKept ? 'kept' as const : null;

    for(const key of node.reports ?? []){
      const reportedAt = new Date(Math.min(NOW - 30_000, at.getTime() + HOUR / 2));
      const resolved = resolution ? { resolvedAt: new Date(Math.min(NOW - 10_000, at.getTime() + 2 * HOUR)), resolvedBy: uid.some, resolution } : {};

      tx.insert(schema.commentReports).values({ commentId: id, userId: uid[key], postId: post.id, createdAt: reportedAt, ...resolved }).run();

      if(resolution){
        continue;
      }

      for(const staff of [ 'some', 'alice' ]){
        tx.insert(schema.notifications).values({ userId: uid[staff], type: 'report.created', actorId: uid[key], postId: post.id, commentId: id, createdAt: reportedAt }).run();
      }
    }

    // Уведомления как у commentNotifications: ответ — автору родителя, иначе — автору поста
    const author = uid[node.by];
    const readAt = NOW - at.getTime() > 2 * DAY ? new Date(at.getTime() + DAY) : null;

    if(!node.deleted && parent && parent.userId !== author){
      tx.insert(schema.notifications).values({ userId: parent.userId, type: 'comment.reply', actorId: author, postId: post.id, commentId: id, readAt, createdAt: at }).run();
    }

    if(!node.deleted && post.userId !== author && parent?.userId !== post.userId){
      tx.insert(schema.notifications).values({ userId: post.userId, type: 'comment.created', actorId: author, postId: post.id, commentId: id, readAt, createdAt: at }).run();
    }

    for(const reply of node.replies ?? []){
      addComment(post, reply, { id, userId: author }, imageIndex);
    }
  }

  // --- Подписки: взаимные пары — «друзья»
  const follows: [ string, string ][] = [
    [ 'anya', 'nina' ], [ 'nina', 'anya' ], [ 'anya', 'timur' ], [ 'timur', 'anya' ], [ 'marat', 'olga' ], [ 'olga', 'marat' ],
    [ 'liza', 'anya' ], [ 'igor', 'nina' ], [ 'bob', 'anya' ], [ 'dan', 'bob' ], [ 'bob', 'dan' ], [ 'some', 'liza' ], [ 'seva', 'igor' ],
  ];
  const popularity: Record<string, number> = { anya: 9, nina: 7, marat: 6, timur: 5, olga: 5, igor: 4, liza: 4, bob: 3, seva: 2, some: 2 };

  for(const [ author, count ] of Object.entries(popularity)){
    for(const reader of pick(readers.filter(k => k !== author), count)){
      follows.push([ reader, author ]);
    }
  }

  const followRows = new Map(follows.map(([ a, b ]) => [ `${a}:${b}`, { followerId: uid[a], followingId: uid[b], createdAt: daysAgo(10 + random() * 200) } ]));

  tx.insert(schema.userFollows).values([ ...followRows.values() ]).run();

  // У тестовых учёток тоже: в «Моей ленте» видны чипы рубрик, у Алисы с авторами — и «ещё N»
  tx.insert(schema.tagFollows).values([
    [ 'dan', 'Путешествия' ], [ 'dan', 'Горы' ], [ 'katya', 'Путешествия' ], [ 'mila', 'Еда' ], [ 'pavel', 'Фотография' ], [ 'vera', 'Книги' ], [ 'gleb', 'Велосипед' ],
    [ 'alice', 'Горы' ], [ 'alice', 'Еда' ], [ 'alice', 'Переводы' ], [ 'alice', 'Север' ],
    [ 'bob', 'Путешествия' ], [ 'bob', 'Фотография' ], [ 'some', 'Книги' ],
  ].map(([ key, tag ]) => ({ userId: uid[key], tagId: tagId[tag], createdAt: daysAgo(30) }))).run();

  // Катя закрылась от Артёма — есть кому показать блокировку
  tx.insert(schema.userBlocks).values({ userId: uid.katya, blockedId: uid.artem, createdAt: daysAgo(4) }).run();

  // --- Сообщения
  dialog('anya', 'nina', [
    [ 'anya', 'Нина, привет! Можно я возьму твой совет про водопад в следующий пост? Со ссылкой, конечно.', 2.2 ],
    [ 'nina', 'Конечно! И если поедешь снова — возьми штатив, я дам свой лёгкий.', 2.1 ],
    [ 'anya', 'Ловлю на слове 🙂 Весной собираюсь в Дербент.', 2 ],
    [ 'nina', 'Тогда и я, может, присоединюсь. Там отличные дворы для плёнки.', 1.9 ],
  ]);
  dialog('mila', 'olga', [
    [ 'mila', 'Ольга, здравствуйте! Вы писали, что можете поделиться закваской. Я в Москве, у метро Сокол.', 1.5 ],
    [ 'olga', 'Здравствуйте! Да, давайте в субботу, я как раз буду кормить Гришу.', 1.4 ],
  ]);
  dialog('dan', 'bob', [
    [ 'dan', 'Борис, добрый день! Хочу на Чусовую в июле, с какого места лучше стартовать новичку?', 0.2 ],
  ], 1);
  // У Бориса — полный мессенджер (спека 42): несколько дней, непрочитанные, свои последние
  dialog('anya', 'bob', [
    [ 'anya', 'Привет! Прочитала про Чусовую — очень вдохновило. Мы как раз собираемся в июле.', 3.1 ],
    [ 'bob', 'Привет! Рад, что пригодилось 🙂 В июле там людно, катамаран лучше бронировать заранее.', 3 ],
    [ 'anya', 'А можно трек в gpx? Хочу повторить.', 0.08 ],
    [ 'anya', 'Ещё вопрос: вы ночевали в палатке или на турбазах?', 0.07 ],
  ], 2);
  dialog('marat', 'bob', [
    [ 'marat', 'Борис, можно перевести ваш пост про сплав на татарский для нашего сообщества?', 1.2 ],
    [ 'bob', 'Конечно, только ссылку на оригинал оставьте.', 1.1 ],
    [ 'marat', 'Спасибо за разрешение, очень выручили!', 0.3 ],
  ], 1);
  dialog('liza', 'bob', [
    [ 'liza', 'Пришлите, пожалуйста, чёрно-белые кадры с переправы — хочу в подборку.', 1.6 ],
    [ 'bob', 'Договорились, пришлю вечером архивом.', 1.5 ],
  ]);
  dialog('katya', 'bob', [
    [ 'katya', 'Фото с Чуйского тракта — огонь!', 5 ],
    [ 'bob', 'Спасибо! Там ещё будет вторая часть.', 4.9 ],
  ]);
  dialog('gleb', 'bob', [
    [ 'gleb', 'Купите велосипед недорого, отдам с багажником', 6 ],
  ]);
  tx.insert(schema.messageIgnores).values({ userId: uid.bob, ignoredId: uid.gleb, createdAt: daysAgo(5.5) }).run();
  tx.insert(schema.messageRestrictions).values({ userId: uid.bob, restrictedId: uid.artem, createdAt: daysAgo(8) }).run();

  // unread — сколько последних сообщений не прочитано собеседником
  function dialog(a: string, b: string, lines: [ string, string, number ][], unread = 0){
    const [ low, high ] = [ uid[a], uid[b] ].sort((x, y) => x - y);
    const last = lines[lines.length - 1];
    const dialogId = tx.insert(schema.dialogs).values({ userLowId: low, userHighId: high, lastMessageAt: daysAgo(last[2]), createdAt: daysAgo(lines[0][2]) }).returning({ id: schema.dialogs.id }).get().id;

    lines.forEach(([ from, content, days ], i) => {
      const isUnread = i >= lines.length - unread;
      tx.insert(schema.messages).values({ dialogId, userId: uid[from], content, createdAt: daysAgo(days), readAt: isUnread ? null : daysAgo(days - 0.01) }).run();
    });

    if(unread > 0){
      const to = last[0] === a ? b : a;
      tx.insert(schema.notifications).values({ userId: uid[to], type: 'message.created', actorId: uid[last[0]], dialogId, createdAt: daysAgo(last[2]) }).run();
    }
  }

  // --- Заявки в авторы: Ева ждёт, Артёму отказали
  tx.insert(schema.authorRequests).values({ userId: uid.eva, text: 'Хочу писать о походах выходного дня под Москвой: маршруты от электрички, снаряжение, где переночевать. Есть фото и треки за два года.', createdAt: daysAgo(1) }).run();
  tx.insert(schema.notifications).values({ userId: uid.alice, type: 'author_request.created', actorId: uid.eva, createdAt: daysAgo(1) }).run();
  tx.insert(schema.authorRequests).values({ userId: uid.artem, text: 'хочу писать', status: 'rejected', reason: 'Расскажите подробнее, о чём будете писать, и приложите пример текста.', decidedBy: uid.alice, decidedAt: daysAgo(20), createdAt: daysAgo(21) }).run();
  tx.insert(schema.notifications).values({ userId: uid.artem, type: 'author_request.rejected', actorId: uid.alice, readAt: daysAgo(19), createdAt: daysAgo(20) }).run();
});

// Старые загрузки больше никто не держит — подчищаем всё, кроме только что созданного
const fresh = new Set([ ...Object.values(avatarKeys), ...[ ...photoFiles.values() ].map(f => f.key) ]);
let removed = 0;

for(const file of readdirSync(UPLOADS)){
  if(!fresh.has(file.replace(/-\d+\.webp$/, ''))){
    rmSync(path.join(UPLOADS, file));
    removed++;
  }
}

console.log(`seed-dev done: ${people.length} users, ${posts.length} posts, ${photoFiles.size} photos; removed ${removed} stale uploads`);

async function cached(name: string, url: string){
  const file = path.join(CACHE, name);

  if(!existsSync(file)){
    const res = await fetch(url, { headers: { 'User-Agent': 'VibeDevSeed/1.0 (local development demo data)' } });

    if(!res.ok){
      throw new Error(`${res.status} ${url}`);
    }

    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return file;
}

// Как saveImageVariants в shared/images.ts: варианты по длинной стороне, webp 82
async function saveVariants(file: string){
  const key = randomUUID();
  const source = sharp(file).rotate();
  const meta = await source.metadata();
  const { width = 0, height = 0 } = meta.autoOrient ?? meta;

  for(const size of IMAGE_WIDTHS){
    await source.clone()
      .resize(width >= height ? { width: size, withoutEnlargement: true } : { height: size, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(UPLOADS, `${key}-${size}.webp`));
  }

  return { key, width, height };
}

// Как saveSquareVariants: квадрат по центру
async function saveSquare(file: string){
  const key = randomUUID();

  for(const size of AVATAR_SIZES){
    await sharp(file).rotate().resize(size, size, { fit: 'cover' }).webp({ quality: 85 }).toFile(path.join(UPLOADS, `${key}-${size}.webp`));
  }

  return key;
}

function daysAgo(days: number){
  return new Date(NOW - days * DAY);
}

function clamp(value: number, min: number, max: number){
  return Math.max(min, Math.min(max, value));
}

function pick<T>(list: T[], count: number){
  return [ ...list ].sort(() => random() - 0.5).slice(0, count);
}

// Детерминированный генератор: повторный запуск даёт те же оценки и подписки
function rng(seed: number){
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
