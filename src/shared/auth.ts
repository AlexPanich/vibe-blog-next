import 'server-only';
import { auth } from "@/globals/auth";
import { AuthUser } from "@/shared/authUser";
import { cookies, headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { cache } from "react";

export const getAuthUser = cache(async () => {
  /*
    Cookie — из cookies(), а не из headers(): headers() — это входящий запрос, а cookies()
    видит и то, что поставил action. Иначе после changePassword с revokeOtherSessions
    рендер в ответе action шёл бы со старым, уже удалённым токеном, и layout выкидывал
    бы на вход
  */
  const reqHeaders = new Headers(await headers());
  reqHeaders.set('cookie', (await cookies()).toString());
  const session = await auth.api.getSession({ headers: reqHeaders })

  return session?.user ? {
    id: +session.user.id,
    name: session.user.name,
    email: session.user.email,
    roles: session.user.roles as AuthUser['roles'],
    avatarKey: (session.user.avatarKey as string | null | undefined) ?? null
  } : undefined;
})

export const requireAuthUser = async () => {
  const user = await getAuthUser();

  if(!user){
    return unauthorized();
  }

  return user;
}
