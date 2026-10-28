import { CONTAINER } from "@/globals/container";
import { db } from "@/globals/db";
import { posts } from "@/database/schema";
import { moderatePosts } from "@/domains/posts/policy";
import PostRow from "@/domains/posts/components/PostRow";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { POST_MODERATION_TABS, postModerationFilterDto } from "@/domains/posts/dto/postModerationRequests";
import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { IconChecks } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Модерация' };

const TABS = {
  moderating: { label: 'На модерации',    empty: 'Очередь пуста — все посты разобраны.' },
  published:  { label: 'Опубликованные',  empty: 'Опубликованных постов нет.' },
  hidden:     { label: 'В архиве',        empty: 'В архиве постов нет.' },
  blocked:    { label: 'Заблокированные', empty: 'Заблокированных постов нет.' },
} as const;

export default async function ModerationPosts({ searchParams }: PageProps<'/office/moderation/posts'>) {
  await CONTAINER.boucerService.breakIfCant(moderatePosts);

  const { status } = postModerationFilterDto.parse(await searchParams);

  // В очереди дольше всех ждущие — сверху, в остальных вкладках — свежие
  const list = await db.query.posts.findMany({
    where: eq(posts.status, status),
    orderBy: status === 'moderating' ? asc(posts.createdAt) : desc(posts.createdAt),
    with: { author: true, reviewer: true, ...POST_TAGS_WITH }
  });

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Модерация</h1>
        <span className="ui-kicker">{ TABS[status].label }: { list.length }</span>
      </div>

      <nav className="ui-filter">
        { POST_MODERATION_TABS.map(s => (
          <Link
            key={s}
            href={s === 'moderating' ? '/office/moderation/posts' : `/office/moderation/posts?status=${s}`}
            data-active={s === status}
          >
            { TABS[s].label }
          </Link>
        )) }
      </nav>

      { list.length === 0 ? (
        <div className="ui-empty">
          <IconChecks size={26} stroke={1.6} />
          <p>{ TABS[status].empty }</p>
        </div>
      ) : (
        <div className="ui-rows">
          { list.map(post => <PostRow
            key={post.id}
            post={post}
            href={`/office/moderation/posts/${post.id}`}
            author={post.author.name}
            tags={pickTags(post)}
            reviewer={post.reviewer?.name}
          />) }
        </div>
      ) }
    </>
  );
}
