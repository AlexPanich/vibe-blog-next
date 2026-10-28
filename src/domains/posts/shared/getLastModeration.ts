import 'server-only';
import { db } from "@/globals/db";
import { postModerations } from "@/database/schema";
import { desc, eq } from "drizzle-orm";

/*
  Последнее решение модератора по посту: история только дописывается, поэтому
  самый большой id — самое свежее решение
*/
export async function getLastModeration(postId: number){
  return db.query.postModerations.findFirst({
    where: eq(postModerations.postId, postId),
    orderBy: desc(postModerations.id)
  });
}
