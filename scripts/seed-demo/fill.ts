import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../../src/database/schema.ts";
import { people, tags } from "./people.ts";
import { demoPosts } from "./posts.ts";
import { comments as commentTrees } from "./comments.ts";
import type { SeedImages } from "./images.ts";
import type { SeedComment } from "./types.ts";

/*
  Демо-контент одной транзакцией: пользователи из people.ts (существующие по email
  обновляются, новые создаются с паролем password123), рубрики, посты всех типов и статусов
  с фото и модерацией, оценки, избранное, ветки комментариев (к постам и к фото, скрытые,
  удалённые, с жалобами), жалобы на посты, подписки, блокировка, сообщения, заявки в авторы и уведомления.
  Даты — от now. Остальной контент база должна не содержать: сид-dev сначала его стирает,
  прод-сид запускается только на пустой базе
*/
export function fillDemo(db: BetterSQLite3Database<typeof schema>, files: SeedImages, now = Date.now()){
  const random = rng(30);
  const daysAgo = (days: number) => new Date(now - days * DAY);
  const pick = <T>(list: T[], count: number) => [ ...list ].sort(() => random() - 0.5).slice(0, count);

  db.transaction(tx => {
    // --- Пользователи
    const uid: Record<string, number> = {};

    for(const person of people){
      const createdAt = new Date(person.since);
      const values = { name: person.name, roles: JSON.stringify(person.roles), bio: person.bio, favoritesPublic: person.favoritesPublic ?? false, messagesFrom: person.messagesFrom ?? 'all', avatarKey: files.avatars[person.key], coverKey: files.covers?.[person.key] ?? null, nameGenitive: person.nameGenitive, bannedAt: null, banReason: null, createdAt };
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
    for(const post of [ ...demoPosts ].sort((a, b) => b.days - a.days)){
      const status = post.status ?? 'published';
      const created = now - post.days * DAY - Math.floor(random() * 10) * HOUR;
      const published = status === 'published' || status === 'hidden' || status === 'blocked';
      const id = tx.insert(schema.posts).values({
        userId: uid[post.author],
        url: post.url,
        title: post.title,
        lead: post.lead ?? null,
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
        const file = files.photos[`${set}-${index}`];

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

      // Жалобы (спека 36): открытые — недавние, с задачей staff; разобранные — через три часа, с итогом жалобщикам
      for(const [ i, report ] of (post.reports ?? []).entries()){
        const resolvedAt = post.reportsResolved ? new Date(created + 3 * HOUR) : null;
        const reportedAt = resolvedAt ? new Date(created + 2 * HOUR + i * 10 * 60_000) : new Date(Math.max(created + HOUR, now - (5 - i) * HOUR));

        tx.insert(schema.postReports).values({
          postId: id,
          userId: uid[report.by],
          reason: report.reason,
          comment: report.comment ?? null,
          createdAt: reportedAt,
          resolvedAt,
          resolvedBy: resolvedAt ? uid.some : null,
          resolution: post.reportsResolved ?? null,
        }).run();

        if(resolvedAt){
          tx.insert(schema.notifications).values({ userId: uid[report.by], type: 'post_report.resolved', actorId: uid.some, postId: id, readAt: resolvedAt, createdAt: resolvedAt }).run();
        }
        else if(i === 0){
          for(const staff of [ 'some', 'alice' ].filter(k => k !== post.author && k !== report.by)){
            tx.insert(schema.notifications).values({ userId: uid[staff], type: 'post_report.created', actorId: uid[report.by], postId: id, createdAt: reportedAt }).run();
          }
        }
      }
    }

    const publishedPosts = demoPosts.filter(p => (p.status ?? 'published') === 'published');

    // --- Оценки: у «Недели в горах Дагестана» лучшая за неделю — она «Выбор редакции»
    for(const post of publishedPosts){
      const { id, createdAt } = postIds[post.url];
      const base = post.url === 'nedelya-v-gorakh-dagestana' ? 4.85 : 3.6 + random() * 1.2;
      const raters = pick(everyone.filter(k => k !== post.author), 4 + Math.floor(random() * 9));

      tx.insert(schema.postRatings).values(raters.map(key => {
        const at = new Date(Math.min(now, createdAt + (1 + random() * 48) * HOUR));

        return { postId: id, userId: uid[key], value: clamp(Math.round(base + (random() - 0.5) * 1.6), 1, 5), createdAt: at, updatedAt: at };
      })).run();

      const fans = pick(readers.filter(k => k !== post.author), Math.floor(random() * 5));

      if(fans.length > 0){
        tx.insert(schema.postFavorites).values(fans.map(key => ({ userId: uid[key], postId: id, createdAt: new Date(createdAt + DAY) }))).run();
      }
    }

    tx.insert(schema.postFavorites).values([ 'nedelya-v-gorakh-dagestana', 'khleb-na-zakvaske', 'peterburg-na-plenku' ]
      .map(url => ({ userId: uid.dan, postId: postIds[url].id, createdAt: daysAgo(0.5) }))).onConflictDoNothing().run();

    // Избранное dan открыто (спека 40): больше 12 закладок — на странице есть «Всё избранное»
    tx.insert(schema.postFavorites).values([ 'teriberka-v-noyabre', 'altay-chuyskiy-trakt', 'kurshskaya-kosa', 'kazan-za-vykhodnye', 'ladozhskie-shkhery', 'vyborg-i-monrepo', 'plov-doma', 'kak-snimat-tuman', 'voskhozhdenie-na-kazbek', 'splav-po-chusovoy' ]
      .map((url, i) => ({ userId: uid.dan, postId: postIds[url].id, createdAt: daysAgo(3 + i * 4) }))).onConflictDoNothing().run();

    // --- Комментарии
    for(const [ url, tree ] of Object.entries(commentTrees)){
      const post = postIds[url];

      for(const node of tree){
        addComment(post, node, null, null);
      }
    }

    function addComment(post: typeof postIds[string], node: SeedComment, parent: { id: number, userId: number } | null, parentImage: number | null){
      const at = new Date(Math.min(now - 60_000, post.createdAt + HOUR + node.hours * HOUR));
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
        const reportedAt = new Date(Math.min(now - 30_000, at.getTime() + HOUR / 2));
        const resolved = resolution ? { resolvedAt: new Date(Math.min(now - 10_000, at.getTime() + 2 * HOUR)), resolvedBy: uid.some, resolution } : {};

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
      const readAt = now - at.getTime() > 2 * DAY ? new Date(at.getTime() + DAY) : null;

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
}

// Хеш better-auth (scrypt) для «password123» — у всех демо-учёток один пароль
const PASSWORD_HASH = '2c5ddde7a24416d978bf9c408a63f70e:9a2eab05d7b39193fd22f60aa9a2683c1fcd4370cc039062421d824be09e045851842dc07d10ca30deb766a4275d0f1de60f1f741836419357e327d13bcbb758';

const HOUR = 60 * 60 * 1000;

const DAY = 24 * HOUR;

function clamp(value: number, min: number, max: number){
  return Math.max(min, Math.min(max, value));
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
