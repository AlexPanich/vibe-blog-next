import { CONTAINER } from "@/globals/container";
import { db } from "@/globals/db";
import { PostStatus, posts, postModerations } from "@/database/schema";
import { adminPosts, decidePostModeration, moderatePosts } from "@/domains/posts/policy";
import PostReviewControls from "@/domains/posts/components/PostReviewControls";
import { requireAuthUser } from "@/shared/auth";
import type { AuthUser } from "@/shared/authUser";
import PostStatusTag from "@/domains/posts/components/PostStatusTag";
import TagChips from "@/domains/tags/exports/TagChips";
import PostTypeMeta from "@/domains/posts/components/PostTypeMeta";
import PostGallery from "@/domains/posts/components/PostGallery";
import { getPostImages } from "@/domains/posts/shared/postImages";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import PostModerationForm from "@/domains/posts/components/PostModerationForm";
import PostBlockingForm from "@/domains/posts/components/PostBlockingForm";
import PostModerationHistory from "@/domains/posts/components/PostModerationHistory";
import { postModerateResource } from "@/domains/posts/dto/postResources";
import { POST_MODERATION_TABS } from "@/domains/posts/dto/postModerationRequests";
import { resource } from "@/core/resource";
import { idOrFail } from "@/shared/params";
import LocalDate from "@/components/general/LocalDate";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import PostMarkdown from "@/domains/posts/components/PostMarkdown";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconCalendar, IconLink, IconUser } from "@tabler/icons-react";

export default async function ModerationPostsItem({ params }: PageProps<'/office/moderation/posts/[id]'>) {
  const id = idOrFail((await params).id);
  await CONTAINER.boucerService.breakIfCant(moderatePosts);

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, id),
    with: {
      author: true,
      reviewer: true,
      ...POST_TAGS_WITH,
      moderations: {
        orderBy: desc(postModerations.id),
        with: { moderator: true }
      }
    }
  });

  // Черновик виден только автору и admin
  if(!post || post.status === 'draft'){
    return notFound();
  }

  const me = await requireAuthUser();

  return (
    <article className="ui-article">
      <Link href={backlink(post.status)} className="ui-backlink">
        <IconArrowLeft size={15} />Модерация
      </Link>

      <h1 className="ui-title ui-title--lg">{ post.title }</h1>

      <div className="ui-meta">
        <PostStatusTag status={post.status} />
        <span className="ui-meta__item">
          <IconUser size={14} stroke={1.8} />{ post.author.name }
        </span>
        <span className="ui-meta__item">
          <IconLink size={14} stroke={1.8} />/{ post.url }
        </span>
        <span className="ui-meta__item">
          <IconCalendar size={14} stroke={1.8} />
          <LocalDate value={post.createdAt} />
        </span>
        <PostTypeMeta post={post} />
        <TagChips tags={pickTags(post)} />
      </div>

      <div className="ui-article__body"><PostMarkdown content={post.content} /></div>

      <PostGallery postId={post.id} title={post.title} images={await getPostImages(post.id)} />

      <div className="ui-actions">
        <div style={{ flex: 1 }}>
          { post.status === 'moderating' && <PostReviewControls
            id={post.id}
            state={post.reviewerId === null ? 'free' : post.reviewerId === me.id ? 'mine' : 'other'}
            reviewer={post.reviewer && post.reviewStartedAt ? { name: post.reviewer.name, startedAt: post.reviewStartedAt } : undefined}
            canTakeover={adminPosts(me)}
          /> }
          <ModerationControls post={post} me={me} />
        </div>
      </div>

      <div className="ui-actions">
        <div style={{ flex: 1 }}>
          <p className="ui-kicker">История модерации</p>
          <PostModerationHistory moderations={post.moderations} />
        </div>
      </div>
    </article>
  );
}

function ModerationControls({ post, me }: { post: { id: number, status: PostStatus, reviewerId: number | null }, me: AuthUser }) {
  const target = resource(postModerateResource, post);

  if(post.status === 'moderating'){
    // Чужое ревью: форму решения не показываем — action всё равно откажет
    return decidePostModeration(me, post) ? <PostModerationForm post={target} /> : null;
  }
  else if(post.status === 'published' || post.status === 'hidden'){
    // key: после смены статуса страница рендерится заново, и без него форма унесла бы введённый текст
    return <PostBlockingForm key="block" post={target} mode="block" />;
  }
  else if(post.status === 'blocked'){
    return <PostBlockingForm key="unblock" post={target} mode="unblock" />;
  }

  return <p className="ui-meta">Пост уже не на модерации.</p>;
}

// Вкладка модерации, в которой лежит пост; для остальных статусов — очередь
function backlink(status: PostStatus){
  const tab = POST_MODERATION_TABS.find(t => t === status);

  return tab && tab !== 'moderating' ? `/office/moderation/posts?status=${tab}` as const : '/office/moderation/posts';
}
