import 'server-only';
import { db } from "@/globals/db";
import { posts } from "@/database/schema";
import { count, eq } from "drizzle-orm";

// Посты в очереди модерации: бейдж «Очередь» в меню кабинета и строка staff на «Начале»
export async function countModeratingPosts(){
  const [ { total } ] = await db.select({ total: count() }).from(posts).where(eq(posts.status, 'moderating'));

  return total;
}
