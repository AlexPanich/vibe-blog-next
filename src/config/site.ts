import 'server-only';

export const siteConfig = {
  // Абсолютные ссылки вне страниц (RSS); тот же адрес, что у better-auth
  url: (process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
  // Описание блога: metadata публичного layout и канал общей RSS-ленты
  description: 'Vibe — блог живых историй: путешествия, переводы и личный опыт'
}
