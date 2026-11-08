import 'server-only';
import { db } from "@/globals/db";
import { posts, type PostStatus } from "@/database/schema";
import type { PostAdminFilterDto } from "@/domains/posts/dto/postAdminRequests";
import { count, countDistinct, desc, eq } from "drizzle-orm";

export const ADMIN_POSTS_PAGE = 20;

/*
  «Все посты» в админке (спека 42, шаг 17): страница постов вкладки с авторами, числа по
  статусам для вкладок и число авторов для подзаголовка. Страница за пределами списка
  прижимается к последней
*/
export async function loadAdminPosts(filter: PostAdminFilterDto){
  const counts = countByStatus();
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const listed = filter.status ? (counts[filter.status] ?? 0) : total;
  const pages = Math.max(1, Math.ceil(listed / ADMIN_POSTS_PAGE));
  const page = Math.min(filter.page, pages);
  const [ { authors } ] = db.select({ authors: countDistinct(posts.userId) }).from(posts).all();
  const rows = listed === 0 ? [] : await db.query.posts.findMany({
    columns: { id: true, title: true, url: true, status: true, userId: true, createdAt: true },
    where: filter.status ? eq(posts.status, filter.status) : undefined,
    orderBy: [ desc(posts.createdAt), desc(posts.id) ],
    limit: ADMIN_POSTS_PAGE,
    offset: (page - 1) * ADMIN_POSTS_PAGE,
    with: { author: { columns: { id: true, name: true, avatarKey: true } } }
  });

  return { rows, counts, total, authors, page, pages };
}

export type AdminPostRow = Awaited<ReturnType<typeof loadAdminPosts>>['rows'][number];

function countByStatus(){
  const rows = db.select({ status: posts.status, n: count() })
    .from(posts)
    .groupBy(posts.status)
    .all();

  return Object.fromEntries(rows.map(row => [ row.status, row.n ])) as Partial<Record<PostStatus, number>>;
}
