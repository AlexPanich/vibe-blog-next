import 'server-only';

export const authConfig = {
  /* для ссылок в письмах, которые собираем сами */
  baseUrl: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  github: {
    clientId: process.env.GITHUB_CLIENT_ID as string,
    clientSecret: process.env.GITHUB_CLIENT_SECRET as string
  }
}
