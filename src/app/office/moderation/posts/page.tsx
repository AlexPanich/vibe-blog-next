import { CONTAINER } from "@/globals/container";
import { db } from "@/globals/db";
import { posts } from "@/database/schema";
import { moderatePosts } from "@/domains/posts/policy";
import PostRow from "@/domains/posts/components/PostRow";
import PostQueueRow from "@/domains/posts/components/PostQueueRow";
import PostFeatureButton from "@/domains/posts/components/PostFeatureButton";
import { featuredNow } from "@/domains/posts/shared/editorsPick";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withRowData } from "@/domains/posts/shared/postRows";
import { POST_MODERATION_TABS, postModerationFilterDto } from "@/domains/posts/dto/postModerationRequests";
import { requireAuthUser } from "@/shared/auth";
import OfficeHead from "@/components/layout/OfficeHead";
import { asc, count, desc, eq, inArray } from "drizzle-orm";
import Link from "@/components/general/Link";
import { IconAward, IconChecks } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Модерация' };

const TABS = {
  moderating: { label: 'На модерации',    short: 'На модерации', empty: 'Очередь пуста — все посты разобраны.' },
  published:  { label: 'Опубликованные',  short: 'Опубликованные', empty: 'Опубликованных постов нет.' },
  blocked:    { label: 'Заблокированные', short: 'Заблок.',      empty: 'Заблокированных постов нет.' },
  hidden:     { label: 'В архиве',        short: 'В архиве',     empty: 'В архиве постов нет.' },
} as const;

/*
  Очередь модерации (спека 42, шаг 13): вкладки статусов с числами; в очереди — строки с
  ревью («Взять на ревью» / «Продолжить» / «Занят»), в остальных вкладках — строки постов.
  У опубликованных — выбор для главной и метка «На главной» у текущего (спека 39)
*/
export default async function ModerationPosts({ searchParams }: PageProps<'/office/moderation/posts'>) {
  await CONTAINER.boucerService.breakIfCant(moderatePosts);

  const me = await requireAuthUser();
  const { status } = postModerationFilterDto.parse(await searchParams);
  const counts = await tabCounts();

  // В очереди — по времени последней отправки, раньше отправленные сверху (спека 49); в остальных вкладках — свежие
  const list = await withRowData(await db.query.posts.findMany({
    where: eq(posts.status, status),
    orderBy: status === 'moderating' ? [ asc(posts.submittedAt), asc(posts.id) ] : desc(posts.createdAt),
    with: { author: true, reviewer: true, ...POST_TAGS_WITH }
  }));

  return (
    <>
      <OfficeHead
        title="Модерация"
        sub="Посты авторов перед публикацией. Взятый на ревью пост решает только тот, кто его взял"
      />

      <nav className="ui-tabs" aria-label="Статус поста">
        { TAB_ORDER.map(s => (
          <Link
            key={s}
            href={s === 'moderating' ? '/office/moderation/posts' : `/office/moderation/posts?status=${s}`}
            data-active={s === status}
          >
            <span className="ui-tabs__label-full">{ TABS[s].label }</span>
            <span className="ui-tabs__label-short">{ TABS[s].short }</span>
            <span className="ui-tabs__count">{ counts[s] }</span>
          </Link>
        )) }
      </nav>

      { list.length === 0 ? (
        <div className="ui-empty">
          <IconChecks size={26} stroke={1.6} />
          <p>{ TABS[status].empty }</p>
        </div>
      ) : status === 'moderating' ? (
        <div className="ui-queue">
          { list.map(post => <PostQueueRow
            key={post.id}
            post={post}
            author={post.author}
            tags={pickTags(post)}
            review={post.reviewerId === null ? 'free' : post.reviewerId === me.id ? 'mine' : 'other'}
            reviewer={post.reviewer?.name}
          />) }
        </div>
      ) : (
        <div className="ui-rows">
          { list.map(post => <PostRow
            key={post.id}
            post={post}
            href={`/office/moderation/posts/${post.id}`}
            author={post.author}
            tags={pickTags(post)}
            badge={status === 'published' && featuredNow(post.featuredAt) && <span className="ui-post-row__pick">
              <IconAward size={12} stroke={2} />На главной
            </span>}
            side={status === 'published' && <PostFeatureButton id={post.id} featured={featuredNow(post.featuredAt)} variant="row" />}
          />) }
        </div>
      ) }
    </>
  );
}

// Порядок вкладок — как в макете
const TAB_ORDER = [ 'moderating', 'published', 'blocked', 'hidden' ] as const satisfies typeof POST_MODERATION_TABS[number][];

// Число постов на каждой вкладке
async function tabCounts(){
  const rows = await db.select({ status: posts.status, n: count() })
    .from(posts)
    .where(inArray(posts.status, POST_MODERATION_TABS))
    .groupBy(posts.status);
  const counts = Object.fromEntries(POST_MODERATION_TABS.map(s => [ s, 0 ])) as Record<typeof POST_MODERATION_TABS[number], number>;

  for(const row of rows){
    counts[row.status as keyof typeof counts] = row.n;
  }

  return counts;
}
