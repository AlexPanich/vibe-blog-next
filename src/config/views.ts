import 'server-only';

export const viewsConfig = {
  // Соль хеша гостя для счётчика просмотров (спека 43). Не задана — секрет better-auth, чтобы старт не падал
  salt: process.env.VIEW_HASH_SALT || process.env.BETTER_AUTH_SECRET || 'dev-view-salt'
}
