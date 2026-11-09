import type { Role } from "../../src/database/schema.ts";

export type Person = {
  key: string,
  name: string,
  email: string,
  roles: Role[],
  bio: string,
  // Когда зарегистрировался: «с ГГГГ в Vibe» в профиле
  since: string,
  // Избранное видно всем на странице автора (спека 40)
  favoritesPublic?: boolean
}

/*
  Первые пять — учётки из README (email и роли те же, пароль password123), test@example.com —
  тестовая учётка, которая уже была в dev-базе. Остальные — новые авторы и читатели
*/
export const people: Person[] = [
  { key: 'alice', name: 'Алиса Воронцова', email: 'alice@example.com', roles: [ 'admin' ], since: '2023-02-14',
    bio: 'Слежу, чтобы Vibe работал и не превращался в доску объявлений. Читаю всё про горы и хлеб, пишу редко и только в рабочий чат.' },
  { key: 'some', name: 'Семён Ильин', email: 'some@example.com', roles: [ 'author', 'moderator' ], since: '2023-03-02',
    bio: 'Модератор и переводчик. Играю в шахматы по переписке, перевожу эссе о том, почему медленное — не значит плохое.' },
  { key: 'bob', name: 'Борис Беляев', email: 'bob@example.com', roles: [ 'author' ], since: '2023-06-19',
    bio: 'Пишу о реках, дорогах и о том, что между ними. Байдарка, старая «Нива» и термос на литр.' },
  { key: 'dan', name: 'Данил Ершов', email: 'dan@example.com', roles: [], since: '2025-09-01', favoritesPublic: true,
    bio: 'Студент, читаю про путешествия и коплю на первую поездку в горы.' },
  { key: 'eva', name: 'Ева Миронова', email: 'eva@example.com', roles: [], since: '2025-11-20',
    bio: 'Хожу в походы выходного дня под Москвой. Подала заявку в авторы — хочу рассказывать о маршрутах на электричке.' },
  { key: 'petr', name: 'Пётр Петрович', email: 'test@example.com', roles: [ 'author' ], since: '2024-01-10',
    bio: 'Тестовая учётка. Иногда пишу, иногда ломаю.' },

  { key: 'anya', name: 'Аня Соколова', email: 'anya@example.com', roles: [ 'author' ], since: '2023-04-08',
    bio: 'Путешествую медленно и рассказываю подробно. Горы Кавказа, русский Север и маленькие города, до которых не доезжают туристы. Снимаю на телефон и не стесняюсь.' },
  { key: 'marat', name: 'Марат Хасанов', email: 'marat@example.com', roles: [ 'author' ], since: '2023-08-30',
    bio: 'Повар по образованию, инженер по профессии. Еду туда, где вкусно, и записываю, что там ели. Плов готовлю только в казане.' },
  { key: 'liza', name: 'Лиза Королёва', email: 'liza@example.com', roles: [ 'author' ], since: '2023-10-12',
    bio: 'Переводчица с английского. Перевожу эссе о чтении, письмах и внимании — то, что хочется дать почитать друзьям, а они не читают по-английски.' },
  { key: 'igor', name: 'Игорь Ветров', email: 'igor@example.com', roles: [ 'author' ], since: '2024-02-03',
    bio: 'Бэкенд-разработчик. Езжу на работу на велосипеде круглый год, держу дома сервер на Raspberry Pi и пишу о вещах, которые работают без облака.' },
  { key: 'nina', name: 'Нина Арсеньева', email: 'nina@example.com', roles: [ 'author' ], since: '2023-05-21',
    bio: 'Фотограф. Снимаю Петербург на плёнку, туманы на цифру и людей — только если разрешат. Рассказываю, как сделан кадр.' },
  { key: 'timur', name: 'Тимур Алиев', email: 'timur@example.com', roles: [ 'author' ], since: '2024-05-15',
    bio: 'Альпинист-любитель, восемь пятитысячников за плечами. Пишу честно: сколько стоило, где было страшно и почему я повернул назад.' },
  { key: 'olga', name: 'Ольга Мельник', email: 'olga@example.com', roles: [ 'author' ], since: '2024-09-09',
    bio: 'Пеку хлеб на закваске уже два года. Записываю удачи и провалы — провалов больше, и они интереснее.' },
  { key: 'seva', name: 'Сева Громов', email: 'seva@example.com', roles: [ 'author' ], since: '2025-01-27',
    bio: 'Учусь играть на гитаре в тридцать пять и собираю винил. Пишу о музыке как любитель, без теории.' },

  { key: 'katya', name: 'Катя Лис', email: 'katya@example.com', roles: [], since: '2024-03-18', favoritesPublic: true,
    bio: 'Читаю Vibe по утрам вместо новостей. Люблю длинные тексты про дороги.' },
  { key: 'pavel', name: 'Павел Орлов', email: 'pavel@example.com', roles: [], since: '2024-07-04',
    bio: 'Фотолюбитель, снимаю на старый Зенит. Задаю много вопросов в комментариях.' },
  { key: 'vera', name: 'Вера Ким', email: 'vera@example.com', roles: [], since: '2024-10-30',
    bio: 'Учительница литературы. Читаю переводы и спорю с ними.' },
  { key: 'gleb', name: 'Глеб Носов', email: 'gleb@example.com', roles: [], since: '2025-02-11',
    bio: 'Велосипедист и походник. В Vibe — за маршрутами.' },
  { key: 'mila', name: 'Мила Ташкова', email: 'mila@example.com', roles: [], since: '2025-06-06',
    bio: 'Готовлю по рецептам из интернета и честно рассказываю, что получилось.' },
  { key: 'artem', name: 'Артём Рыбаков', email: 'artem@example.com', roles: [], since: '2025-08-22',
    bio: 'Только начал читать Vibe. Пока больше молчу.' },
];

export const tags = [
  [ 'Путешествия', 'puteshestviya' ],
  [ 'Горы', 'gory' ],
  [ 'Города', 'goroda' ],
  [ 'Еда', 'eda' ],
  [ 'Фотография', 'fotografiya' ],
  [ 'Переводы', 'perevody' ],
  [ 'Книги', 'knigi' ],
  [ 'Заметки', 'zametki' ],
  [ 'Технологии', 'tekhnologii' ],
  [ 'Велосипед', 'velosiped' ],
  [ 'Музыка', 'muzyka' ],
  [ 'Север', 'sever' ],
] as const;

export type TagName = (typeof tags)[number][0];
