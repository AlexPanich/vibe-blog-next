import 'server-only';
import { siteConfig } from "@/config/site";

/*
  POST с cookie из браузера — только со своего сайта (спека 57, п. 12, план 57, реш. 10). fetch с
  POST шлёт Origin всегда, поэтому без заголовка — тоже чужой
*/
export function isSameOrigin(request: Request){
  const origin = request.headers.get('origin');

  return origin !== null && origin === new URL(siteConfig.url).origin;
}
