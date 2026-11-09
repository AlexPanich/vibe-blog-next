import Link from "@/components/general/Link";
import type { PostStatus } from "@/database/schema";
import type { Post, Tag } from "@/database/types";
import PostRow from "@/domains/posts/components/PostRow";
import type { PostRowData } from "@/domains/posts/shared/postRows";
import { POST_STATUS_TAB_LABELS } from "@/domains/posts/shared/postStatuses";
import { IconArrowRight } from "@tabler/icons-react";

// Вкладки «Начала», как в макете; отклонённые и прочие видны во «Все»
export const RECENT_POST_TABS = [ 'draft', 'moderating', 'published' ] as const satisfies PostStatus[];

export type RecentPostsTab = typeof RECENT_POST_TABS[number]

type RecentPostsProps = {
  posts: (Pick<Post, 'id' | 'title' | 'status' | 'createdAt' | 'publishedAt'> & Pick<PostRowData, 'cover' | 'rating' | 'commentsCount' | 'note'> & { tags: Pick<Tag, 'id' | 'name'>[], views: number })[],
  statuses: Partial<Record<PostStatus, number>>,
  total: number,
  tab: RecentPostsTab | null
}

/*
  «Мои посты» на «Начале» (спека 42): последние посты с вкладками по статусам (?posts=).
  Вкладка без постов не показывается; «Все N» ведёт в полный список
*/
export default function RecentPosts({ posts, statuses, total, tab }: RecentPostsProps) {
  const tabs = RECENT_POST_TABS.filter(status => (statuses[status] ?? 0) > 0);

  return (
    <section className="ui-start-posts">
      <div className="ui-start-posts__head">
        <h2 className="ui-start-posts__title">Мои посты</h2>
        <Link href="/office/posts" className="ui-start-posts__all">Все { total }<IconArrowRight size={14} stroke={2} /></Link>
      </div>

      { tabs.length > 1 && <nav className="ui-tabs" aria-label="Статус поста">
        <Link href="/office" scroll={false} data-active={tab === null}>
          Все <span className="ui-tabs__count">{ total }</span>
        </Link>
        { tabs.map(status => (
          <Link key={status} href={`/office?posts=${status}`} scroll={false} data-active={tab === status}>
            { POST_STATUS_TAB_LABELS[status] } <span className="ui-tabs__count">{ statuses[status] }</span>
          </Link>
        )) }
      </nav> }

      { posts.length === 0
        ? <p className="ui-meta">Здесь пусто — все посты в других статусах.</p>
        : <div className="ui-rows">
          { posts.map(post => <PostRow key={post.id} post={post} href={`/office/posts/${post.id}`} tags={post.tags} views={post.views} editable />) }
        </div> }
    </section>
  );
}
