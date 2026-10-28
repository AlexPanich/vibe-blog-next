/*
  С ip тут полный трэш, так как нет доступа к socket ip, а заголовки клиент может прислать какие угодно.
  Части x-forwarded-for можно доверять, но только при правильной настройке прокси:
  trustedHops — сколько прокси перед приложением добавляют себя в заголовок.
*/
const FALLBACK_IP = '::1';

export function getIpFromHeaders(headers: Headers, trustedHops: number) {
  const forwardedFor = headers.get('x-forwarded-for');

  if(!forwardedFor){
    return FALLBACK_IP;
  }

  const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(Boolean);
  const index = Math.max(ips.length - Math.max(trustedHops, 1), 0);

  return ips[index] ?? FALLBACK_IP;
}
