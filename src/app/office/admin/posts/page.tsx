import { CONTAINER } from "@/globals/container";
import { db } from "@/globals/db";
import { POST_STATUSES, posts } from "@/database/schema";
import { adminPosts } from "@/domains/posts/policy";
import PostRow from "@/domains/posts/components/PostRow";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { postAdminFilterDto } from "@/domains/posts/dto/postAdminRequests";
import { POST_STATUS_LABELS } from "@/domains/posts/shared/postStatuses";
import { desc, eq } from "drizzle-orm";
import Link from "@/components/general/Link";
import { IconChessKnight } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Все посты' };

export default async function AdminPosts({ searchParams }: PageProps<'/office/admin/posts'>) {
  await CONTAINER.boucerService.breakIfCant(adminPosts);

  const { status } = postAdminFilterDto.parse(await searchParams);

  const list = await db.query.posts.findMany({
    where: status ? eq(posts.status, status) : undefined,
    orderBy: desc(posts.createdAt),
    with: { author: true, ...POST_TAGS_WITH }
  });

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Все посты</h1>
      </div>

      <nav className="ui-filter">
        <Link href="/office/admin/posts" data-active={!status}>Все</Link>
        { POST_STATUSES.map(s => (
          <Link key={s} href={`/office/admin/posts?status=${s}`} data-active={s === status}>
            { POST_STATUS_LABELS[s] }
          </Link>
        )) }
      </nav>

      { list.length === 0 ? (
        <div className="ui-empty">
          <IconChessKnight size={26} stroke={1.6} />
          <p>Постов нет.</p>
        </div>
      ) : (
        <div className="ui-rows">
          { list.map(post => <PostRow
            key={post.id}
            post={post}
            href={`/office/posts/${post.id}`}
            author={post.author.name}
            tags={pickTags(post)}
          />) }
        </div>
      ) }
    </>
  );
}
