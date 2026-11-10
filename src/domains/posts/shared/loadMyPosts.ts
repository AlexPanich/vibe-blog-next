import 'server-only';
import { db } from "@/globals/db";
import { posts, type PostStatus } from "@/database/schema";
import type { MyPostsFilterDto } from "@/domains/posts/dto/postOfficeRequests";
import { POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withRowData } from "@/domains/posts/shared/postRows";
import { postViewTotals } from "@/domains/posts/shared/postViews";
import { textLike } from "@/shared/textLike";
import { and, count, desc, eq } from "drizzle-orm";

export const MY_POSTS_PAGE = 20;

/*
  «Мои посты» (спека 42, шаг 3): страница постов автора по вкладке и поиску, числа на
  вкладках (с учётом поиска) и все посты по статусам — для строки под заголовком.
  Страница за пределами списка прижимается к последней
*/
export async function loadMyPosts(userId: number, filter: MyPostsFilterDto){
  const mine = eq(posts.userId, userId);
  const search = filter.q ? textLike(posts.title, filter.q) : undefined;
  const all = countByStatus(mine);
  const found = search ? countByStatus(and(mine, search)) : all;
  const total = filter.status ? (found[filter.status] ?? 0) : sum(found);
  const pages = Math.max(1, Math.ceil(total / MY_POSTS_PAGE));
  const page = Math.min(filter.page, pages);
  const rowData = total === 0 ? [] : await withRowData(await db.query.posts.findMany({
    where: and(mine, search, filter.status ? eq(posts.status, filter.status) : undefined),
    orderBy: [ desc(posts.createdAt), desc(posts.id) ],
    limit: MY_POSTS_PAGE,
    offset: (page - 1) * MY_POSTS_PAGE,
    with: POST_TAGS_WITH
  }));
  // Свои посты — просмотры видно (спека 43)
  const views = postViewTotals(rowData.map(row => row.id));
  const rows = rowData.map(row => ({ ...row, views: views.get(row.id) ?? 0 }));

  return { rows, all, found, foundTotal: sum(found), page, pages };
}

function countByStatus(where: ReturnType<typeof and>){
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
