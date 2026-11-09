import 'server-only';
import { db } from "@/globals/db";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cache } from "react";
import { parseRoles } from "@/domains/users/shared/userRoles";

/*
  Автор для публичной страницы: общая загрузка для metadata и страницы. Аргумент — число,
  чтобы '1' и 1 не стали разными ключами cache
*/
export const getAuthor = cache(async (id: number) => {
  const author = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, name: true, bio: true, avatarKey: true, roles: true, createdAt: true, favoritesPublic: true }
  });

  return author ? { ...author, roles: parseRoles(author.roles) } : notFound();
});
