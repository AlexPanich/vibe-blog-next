import { CONTAINER } from "@/globals/container";
import { db } from "@/globals/db";
import { PostStatus, posts, postModerations } from "@/database/schema";
import { adminPosts, decidePostModeration, moderatePosts } from "@/domains/posts/policy";
import { requireAuthUser } from "@/shared/auth";
import type { AuthUser } from "@/shared/authUser";
import { getPostImages } from "@/domains/posts/shared/postImages";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { POST_STATUS_LABELS } from "@/domains/posts/shared/postStatuses";
import PostReviewPreview from "@/domains/posts/components/PostReviewPreview";
import PostReviewDecision from "@/domains/posts/components/PostReviewDecision";
import PostBlockingForm from "@/domains/posts/components/PostBlockingForm";
import PostModerationHistory from "@/domains/posts/components/PostModerationHistory";
import PostFeatureButton from "@/domains/posts/components/PostFeatureButton";
import LocalDate from "@/components/general/LocalDate";
import { EDITORS_PICK_DAYS, editorsPickUntil, featuredNow } from "@/domains/posts/shared/editorsPick";
import { postModerateResource } from "@/domains/posts/dto/postResources";
import { POST_MODERATION_TABS } from "@/domains/posts/dto/postModerationRequests";
import OfficeCrumbs from "@/components/layout/OfficeCrumbs";
import Link from "@/components/general/Link";
import { resource } from "@/core/resource";
import { idOrFail } from "@/shared/params";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { IconChevronLeft } from "@tabler/icons-react";

/*
  Ревью поста (спека 42, шаг 14): слева пост глазами читателя, справа карточка решения и
  история модерации. На телефоне решение — шторка снизу, история — сворачиваемая строка
*/
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
  const images = await getPostImages(post.id);
  const back = backlink(post.status);
  const reviewer = post.status === 'moderating' && post.reviewer && post.reviewStartedAt
    ? { name: post.reviewer.name, mine: post.reviewerId === me.id, startedAt: post.reviewStartedAt }
    : undefined;

  return (
    <div className="ui-review-page">
      <OfficeCrumbs items={[
        { label: 'Модерация', href: back.href },
        { label: post.status === 'moderating' ? 'На ревью' : POST_STATUS_LABELS[post.status] }
      ]} />
      <Link href={back.href} className="ui-backlink ui-review-page__back">
        <IconChevronLeft size={16} stroke={2} />{ back.label }
      </Link>

      <div className="ui-review-page__columns">
        <PostReviewPreview post={post} author={post.author} tags={pickTags(post)} images={images} />

        <aside className="ui-review-page__aside">
          <Decision post={post} me={me} />
          <PostModerationHistory post={post} moderations={post.moderations} review={reviewer} />
        </aside>
      </div>
    </div>
  );
}

type DecisionPost = {
  id: number,
  status: PostStatus,
  reviewerId: number | null,
  reviewStartedAt: Date | null,
  featuredAt: Date | null,
  reviewer: { name: string } | null
}

function Decision({ post, me }: { post: DecisionPost, me: AuthUser }) {
  const target = resource(postModerateResource, post);

  if(post.status === 'moderating'){
    return <PostReviewDecision
      id={post.id}
      review={post.reviewerId === null ? 'free' : post.reviewerId === me.id ? 'mine' : 'other'}
      reviewer={post.reviewer && post.reviewStartedAt ? { name: post.reviewer.name, startedAt: post.reviewStartedAt } : undefined}
      // Чужое ревью: формы решения нет — action всё равно откажет
      canDecide={decidePostModeration(me, post)}
      canTakeover={adminPosts(me)}
    />;
  }
  else if(post.status === 'published'){
    return <>
      <EditorsPick id={post.id} featuredAt={post.featuredAt} />
      <section className="ui-decision"><PostBlockingForm key="block" post={target} mode="block" /></section>
    </>;
  }
  else if(post.status === 'hidden'){
    // key: после смены статуса страница рендерится заново, и без него форма унесла бы введённый текст
    return <section className="ui-decision"><PostBlockingForm key="block" post={target} mode="block" /></section>;
  }
  else if(post.status === 'blocked'){
    return <section className="ui-decision"><PostBlockingForm key="unblock" post={target} mode="unblock" /></section>;
  }

  return <section className="ui-decision"><p className="ui-decision__note">Пост уже не на модерации.</p></section>;
}

// Выбор для главной у опубликованного (спека 39) — над блокировкой
function EditorsPick({ id, featuredAt }: { id: number, featuredAt: Date | null }) {
  const featured = featuredAt !== null && featuredNow(featuredAt);

  return (
    <section className="ui-decision">
      <h2 className="ui-decision__title">Выбор редакции</h2>
      <p className="ui-decision__note">
        { featured
          ? <>Пост на главной до <LocalDate value={editorsPickUntil(featuredAt)} options={{ day: 'numeric', month: 'long' }} />. Снимете — главная вернётся к лучшему за неделю.</>
          : `Пост встанет на главную на ${EDITORS_PICK_DAYS} дней, прежний выбор снимется. Автор получит уведомление.` }
      </p>
      <div><PostFeatureButton id={id} featured={featured} variant="panel" /></div>
    </section>
  );
}

// Вкладка модерации, в которой лежит пост; для остальных статусов — очередь
function backlink(status: PostStatus){
  const tab = POST_MODERATION_TABS.find(t => t === status);

  return tab && tab !== 'moderating'
    ? { href: `/office/moderation/posts?status=${tab}` as const, label: 'Модерация' }
    : { href: '/office/moderation/posts' as const, label: 'Очередь' };
}
