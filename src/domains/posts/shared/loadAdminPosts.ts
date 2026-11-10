import 'server-only';
import { db } from "@/globals/db";
import { posts, type PostStatus } from "@/database/schema";
import type { PostAdminFilterDto } from "@/domains/posts/dto/postAdminRequests";
import { postViewTotals } from "@/domains/posts/shared/postViews";
import { likePattern, textLike } from "@/shared/textLike";
import { and, count, countDistinct, desc, eq, or, sql, type SQL } from "drizzle-orm";

export const ADMIN_POSTS_PAGE = 20;

/*
  «Все посты» в админке (спека 42, шаг 17): страница постов вкладки с авторами, числа по
  статусам для вкладок (с учётом поиска, спека 44), всего постов и авторов — для
  подзаголовка. Страница за пределами списка прижимается к последней
*/
export async function loadAdminPosts(filter: PostAdminFilterDto){
  const search = filter.q ? searchWhere(filter.q) : undefined;
  const all = countByStatus(undefined);
  const counts = search ? countByStatus(search) : all;
  const total = sum(all);
  const foundTotal = sum(counts);
  const listed = filter.status ? (counts[filter.status] ?? 0) : foundTotal;
  const pages = Math.max(1, Math.ceil(listed / ADMIN_POSTS_PAGE));
  const page = Math.min(filter.page, pages);
  const [ { authors } ] = db.select({ authors: countDistinct(posts.userId) }).from(posts).all();
  const found = listed === 0 ? [] : await db.query.posts.findMany({
    columns: { id: true, title: true, url: true, status: true, userId: true, createdAt: true },
    where: and(search, filter.status ? eq(posts.status, filter.status) : undefined),
    orderBy: [ desc(posts.createdAt), desc(posts.id) ],
    limit: ADMIN_POSTS_PAGE,
    offset: (page - 1) * ADMIN_POSTS_PAGE,
    with: { author: { columns: { id: true, name: true, avatarKey: true } } }
  });
  // Admin видит просмотры всех постов (спека 43)
  const views = postViewTotals(found.map(row => row.id));
  const rows = found.map(row => ({ ...row, views: views.get(row.id) ?? 0 }));

  return { rows, counts, total, foundTotal, authors, page, pages };
}

export type AdminPostRow = Awaited<ReturnType<typeof loadAdminPosts>>['rows'][number];

/*
  Заголовок или имя автора без регистра. Подзапрос по users — сырым SQL с алиасом: в запросе из
  одной таблицы drizzle пишет колонки без таблицы, и "name" связался бы не с той таблицей
*/
function searchWhere(q: string){
  return or(
    textLike(posts.title, q),
    sql`${posts.userId} IN (SELECT u.id FROM users u WHERE lower_ru(u.name) LIKE ${likePattern(q)} ESCAPE '\\')`
  );
}

function countByStatus(where: SQL | undefined){
  const rows = db.select({ status: posts.status, n: count() })
    .from(posts)
    .where(where)
    .groupBy(posts.status)
    .all();

  return Object.fromEntries(rows.map(row => [ row.status, row.n ])) as Partial<Record<PostStatus, number>>;
}

function sum(counts: Partial<Record<PostStatus, number>>){
  return Object.values(counts).reduce((total, n) => total + n, 0);
}
