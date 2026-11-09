import 'server-only';
import { getAuthUser } from "@/shared/auth";
import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE, returnServerError } from "next-safe-action";
import { unauthorized } from "next/navigation";

export type ActionServerError = {
  code: number,
  message: string,
  /*
    Бан при входе (код 423, спека 46): форма сама собирает текст со сроком в часовом поясе
    браузера, message — запасной текст. until — ISO-строка (payload сериализуется), null — навсегда
  */
  ban?: { reason: string, until: string | null }
}

export const actionClient = createSafeActionClient({
  handleServerError(e): ActionServerError {
    console.error('Action error:', e);
    return { code: 500, message: DEFAULT_SERVER_ERROR_MESSAGE };
  }
});

export const actionAuthClient = actionClient.use(async ({ next }) => {
  const auth = await getAuthUser();

  if(!auth){
    return unauthorized();
  }

  return next({ ctx: { auth } })
})

/* returnServerError не проверяет тип, эта обёртка держит его в рамках ActionServerError */
export function actionError(code: number, message: string, extra?: Omit<ActionServerError, 'code' | 'message'>): never {
  return returnServerError<ActionServerError>({ code, message, ...extra });
}
