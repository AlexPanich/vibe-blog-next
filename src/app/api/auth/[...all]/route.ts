import { auth } from "@/globals/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

/*
  Наружу отдаём только то, что реально работает по HTTP.
  Вход / регистрация по паролю и прочее — через server actions
*/
const ALLOWED_PATHS = {
  GET: [
    '/get-session',     // auth-client getSession
    '/verify-email',    // ссылка из письма
    '/callback/github', // oauth
    '/error',           // страница ошибок oauth
  ],
  POST: [
    '/sign-in/social',  // кнопка github
    '/sign-out',        // выход
  ],
};

const handler = toNextJsHandler(auth);
const basePath = '/api/auth';

function guard(method: keyof typeof ALLOWED_PATHS) {
  return (request: NextRequest) => {
    const path = request.nextUrl.pathname.slice(basePath.length);

    if(!ALLOWED_PATHS[method].includes(path)){
      return new Response('Not Found', { status: 404 });
    }

    return handler[method](request);
  }
}

export const GET = guard('GET');
export const POST = guard('POST');
