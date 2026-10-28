/*
  Сколько прокси перед приложением добавляют себя в x-forwarded-for.
  При правильной настройке nginx: proxy_set_header X-Forwarded-For $remote_addr;
*/
export const proxyConfig = {
  trustedHops: Number(process.env.TRUSTED_PROXY_HOPS ?? 1)
}
