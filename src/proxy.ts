import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'
import { rateLimiters } from '@/globals/rateLimiter'
import { rateLimitRequest } from '@/shared/rateLimitProxy'

export async function proxy(request: NextRequest) {
  const limited = await rateLimitRequest(request, [ rateLimiters.globalSec, rateLimiters.globalMin ]);

  if(limited){
    return limited;
  }

  if(!request.nextUrl.pathname.startsWith('/office')){
    return NextResponse.next();
  }

  const token = getSessionCookie(request);

  if(token){
    // Это не защита! requireAuthUser будут делать страницы. Это лишь быстрый выход, когда токена
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/auth/login', request.url))
}

export const config = {
  matcher: [
    // всё, кроме статики next и файлов с расширением
    '/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)'
  ]
}
