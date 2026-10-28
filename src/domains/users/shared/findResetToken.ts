import 'server-only';
import { db } from "@/globals/db";
import { verifications } from "@/database/schema";
import { and, eq, gt } from "drizzle-orm";

/*
  Живой токен сброса пароля, без потребления: страница сразу говорит, что ссылка не работает,
  а не после ввода пароля. Потребляет токен только resetPassword в better-auth
*/
export async function findResetToken(token: string){
  return db.query.verifications.findFirst({
    where: and(eq(verifications.identifier, `reset-password:${token}`), gt(verifications.expiresAt, new Date()))
  });
}
