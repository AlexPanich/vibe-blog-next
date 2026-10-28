import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { count } from "drizzle-orm";
import * as schema from "../src/database/schema.ts";
import { databaseConfig } from "../src/config/database.ts";

/*
  Демо-данные для пустой базы (docker/entrypoint.sh): учётки по ролям, рубрики, посты во
  всех заметных статусах, комментарии и ожидающая заявка в авторы. База уже не пустая —
  ничего не делает: на своём сервере сид не затрёт живые данные.
  Запускается голым node — импорты относительные, без '@/'
*/

// Хеш better-auth (scrypt) для «password123» — у всех демо-учёток один пароль
const PASSWORD_HASH = '2c5ddde7a24416d978bf9c408a63f70e:9a2eab05d7b39193fd22f60aa9a2683c1fcd4370cc039062421d824be09e045851842dc07d10ca30deb766a4275d0f1de60f1f741836419357e327d13bcbb758';

const DAY = 24 * 60 * 60 * 1000;

const db = drizzle(new Database(databaseConfig.path), { schema });
const [ { n } ] = db.select({ n: count() }).from(schema.users).all();

if(n > 0){
  console.log('seed skipped: database is not empty');
  process.exit(0);
}

db.transaction(tx => {
  const user = (name: string, email: string, roles: schema.Role[], bio: string | null = null) => {
    const createdAt = daysAgo(30);
    const [ { id } ] = tx.insert(schema.users)
      .values({ name, email, emailVerified: true, roles: JSON.stringify(roles), bio, createdAt, updatedAt: createdAt })
      .returning({ id: schema.users.id })
      .all();

    tx.insert(schema.accounts).values({
      userId: id,
      accountId: String(id),
      providerId: 'credential',
      password: PASSWORD_HASH,
      createdAt,
      updatedAt: createdAt
    }).run();

    return id;
  };

  const alice = user('Alice', 'alice@example.com', [ 'admin' ]);
  const some = user('Some', 'some@example.com', [ 'author', 'moderator' ], 'Модерирую и иногда перевожу статьи о шахматах.');
  const bob = user('Bob', 'bob@example.com', [ 'author' ], 'Пишу о горах, дорогах и том, что между ними.');
  const dan = user('Dan', 'dan@example.com', []);
  const eva = user('Eva', 'eva@example.com', []);

  const tag = (name: string, slug: string) => tx.insert(schema.tags)
    .values({ name, nameKey: name.toLocaleLowerCase('ru'), slug })
    .returning({ id: schema.tags.id })
    .all()[0].id;

  const travel = tag('Путешествия', 'puteshestviya');
  const translations = tag('Переводы', 'perevody');
  const notes = tag('Заметки', 'zametki');

  const post = (values: Omit<typeof schema.posts.$inferInsert, 'createdAt'> & { days: number }, tags: number[]) => {
    const { days, ...rest } = values;
    const createdAt = daysAgo(days);
    const [ { id } ] = tx.insert(schema.posts)
      .values({ ...rest, createdAt, publishedAt: rest.status === 'published' ? createdAt : null })
      .returning({ id: schema.posts.id })
      .all();

    if(tags.length > 0){
      tx.insert(schema.postTags).values(tags.map(tagId => ({ postId: id, tagId }))).run();
    }

    return id;
  };

  const mountains = post({
    userId: bob,
    url: 'nedelya-v-gorakh-dagestana',
    title: 'Неделя в горах Дагестана',
    content: 'Гуниб, Чох и Салтинский водопад за семь дней.\n\n## Маршрут\n\nСтартовали из Махачкалы, дальше — на машине по серпантину. Лучшее время — сентябрь: жара спала, а дожди ещё не начались.\n\n> Горы не прощают спешки.',
    status: 'published',
    type: 'travel',
    lat: 42.3897,
    lng: 46.9583,
    days: 12
  }, [ travel ]);

  post({
    userId: bob,
    url: 'kak-ya-vybirayu-marshrut',
    title: 'Как я выбираю маршрут',
    content: 'Три вопроса перед каждой поездкой: сколько дней, какой транспорт и что будет, если всё пойдёт не по плану.\n\n- карта офлайн;\n- запас по времени;\n- один день без планов.',
    status: 'published',
    days: 8
  }, [ notes ]);

  post({
    userId: some,
    url: 'pochemu-shakhmaty-uchat-terpeniyu',
    title: 'Почему шахматы учат терпению',
    content: 'Перевод эссе о том, как партия на два часа меняет отношение ко времени.\n\nГлавная мысль автора: в шахматах выигрывает не тот, кто быстрее видит ход, а тот, кто дольше его проверяет.',
    status: 'published',
    type: 'translate',
    source: 'https://example.com/chess-patience',
    days: 5
  }, [ translations, notes ]);

  post({
    userId: bob,
    url: 'osenniy-tbilisi',
    title: 'Осенний Тбилиси',
    content: 'Серные бани, Старый город и хинкали в переулках Сололаки. Пост ждёт модератора — его видно в очереди.',
    status: 'moderating',
    type: 'travel',
    lat: 41.6938,
    lng: 44.8015,
    days: 1
  }, [ travel ]);

  post({
    userId: bob,
    url: 'chernovik-pro-baykal',
    title: 'Черновик про Байкал',
    content: 'Лёд, нерпы и Ольхон. Пока только наброски.',
    status: 'draft',
    days: 0
  }, []);

  const [ { id: question } ] = tx.insert(schema.comments)
    .values({ postId: mountains, userId: dan, content: 'А на чём добирались до Гуниба — своя машина или такси?', createdAt: daysAgo(10) })
    .returning({ id: schema.comments.id })
    .all();

  tx.insert(schema.comments)
    .values({ postId: mountains, userId: bob, parentId: question, content: 'Своя машина: такси по серпантину выходит дороже аренды.', createdAt: daysAgo(9) })
    .run();

  tx.insert(schema.userFollows).values([
    { followerId: dan, followingId: bob },
    { followerId: alice, followingId: bob },
  ]).run();

  // Заявка в авторы — чтобы у admin было что разобрать; dan подаёт свою сам на демо
  tx.insert(schema.authorRequests).values({
    userId: eva,
    text: 'Хочу писать о походах выходного дня под Москвой: маршруты, снаряжение, где переночевать.',
    createdAt: daysAgo(1)
  }).run();
  tx.insert(schema.notifications).values({ userId: alice, type: 'author_request.created', actorId: eva, createdAt: daysAgo(1) }).run();
});

console.log('seed done');

function daysAgo(days: number){
  return new Date(Date.now() - days * DAY);
}
