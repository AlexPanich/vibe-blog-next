import 'server-only';
import { proxyConfig } from "@/config/proxy";
import { getIpFromHeaders } from "@/core/ip";
import { NextResponse } from "next/server";
import { RateLimiterAbstract, RateLimiterRes } from "rate-limiter-flexible";

/*
  Для proxy: списывает очко у каждого limiter по ip запроса. null — можно пропускать дальше,
  иначе готовый ответ 429 с Retry-After.
*/
export async function rateLimitRequest(request: Request, limiters: RateLimiterAbstract[]): Promise<NextResponse | null> {
  const ip = getIpFromHeaders(request.headers, proxyConfig.trustedHops);

  try{
    await Promise.all(limiters.map(l => l.consume(ip)));
    return null;
  }
  catch(e: unknown){
    if(!(e instanceof RateLimiterRes)){
      throw e;
    }

    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(e.msBeforeNext / 1000)) }
    });
  }
}
