import 'server-only';
import { posts } from "@/database/schema";
import { AuthUser } from "@/shared/authUser";
import { eq, isNull, or, type SQL } from "drizzle-orm";

/*
  То же правило, что decidePostModeration, но условием в UPDATE: другой модератор мог взять
  пост на ревью между открытием страницы и решением. Для admin ограничения нет
*/
export function reviewGuard(user: AuthUser): SQL | undefined {
  return user.roles.includes('admin') ? undefined : or(isNull(posts.reviewerId), eq(posts.reviewerId, user.id));
}
