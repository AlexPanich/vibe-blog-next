import { CONTAINER } from "@/globals/container";
import { editPost, ownerTransitions, workWithPost } from "@/domains/posts/policy";
import Link from "@/components/general/Link";
import PostMarkdown from "@/domains/posts/components/PostMarkdown";
import PostStatusTag from "@/domains/posts/components/PostStatusTag";
import PostTransitionButtons from "@/domains/posts/components/PostTransitionButtons";
import PostEditButton from "@/domains/posts/components/PostEditButton";
import { postTransitionsResource } from "@/domains/posts/dto/postResources";
import { getPost } from "@/domains/posts/shared/getPost";
import { getLastModeration } from "@/domains/posts/shared/getLastModeration";
import { getPostTags } from "@/domains/posts/shared/getPostTags";
import TagChips from "@/domains/tags/exports/TagChips";
import PostTypeMeta from "@/domains/posts/components/PostTypeMeta";
import PostGallery from "@/domains/posts/components/PostGallery";
import { getPostImages } from "@/domains/posts/shared/postImages";
import { resource } from "@/core/resource";
import { requireAuthUser } from "@/shared/auth";
import { idOrFail } from "@/shared/params";
import { db } from "@/globals/db";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import ButtonLink from "@/components/general/ButtonLink";
import LocalDate from "@/components/general/LocalDate";
import { IconArrowLeft, IconCalendar, IconExternalLink, IconLink, IconPencil } from "@tabler/icons-react";

// Что будет при правке — объясняет подтверждение «Изменить» (спека 25)
const STATUS_HINTS = {
  draft: null,
  moderating: null,
  published: null,
  rejected: null,
  hidden: 'Пост в архиве и не виден в ленте. Восстановленный пост сразу вернётся в публикацию.',
  blocked: 'Пост не виден в ленте.',
} as const;

// Решение модератора, которое автор видит над постом
const DECISION_NOTES = {
  rejected: 'Комментарий модератора',
  blocked: 'Пост заблокирован модератором',
} as const;

export default async function OfficePostsItem({ params }: PageProps<'/office/posts/[id]'>) {
  const post = await getPost(idOrFail((await params).id));
  await CONTAINER.boucerService.breakIfCant(u => workWithPost(u, post));

  const user = await requireAuthUser();
  const noteLabel = post.status === 'rejected' || post.status === 'blocked' ? DECISION_NOTES[post.status] : null;
  const decision = noteLabel ? await getLastModeration(post.id) : undefined;
  const hint = STATUS_HINTS[post.status];
  const tags = await getPostTags(post.id);
  // Автор видит, что пост уже смотрят — и кто
  const reviewer = post.status === 'moderating' && post.reviewerId
    ? await db.query.users.findFirst({ where: eq(users.id, post.reviewerId), columns: { name: true } })
    : undefined;

  return (
    <article className="ui-article">
      <Link href="/office/posts" className="ui-backlink">
        <IconArrowLeft size={15} />Мои посты
      </Link>

      <h1 className="ui-title ui-title--lg">{ post.title }</h1>
      { post.lead && <p className="ui-article__lead">{ post.lead }</p> }

      <div className="ui-meta">
        <PostStatusTag status={post.status} />
        <span className="ui-meta__item">
          <IconLink size={14} stroke={1.8} />/{ post.url }
        </span>
        <span className="ui-meta__item">
          <IconCalendar size={14} stroke={1.8} />
          <LocalDate value={post.createdAt} />
        </span>
        <PostTypeMeta post={post} />
        <TagChips tags={tags} />
      </div>

      { decision && <div className="ui-note ui-note--danger">
        <span className="ui-note__label">{ noteLabel }</span>
        { decision.comment }
      </div> }

      { hint && <div className="ui-note">{ hint }</div> }

      { reviewer && <div className="ui-note">Пост смотрит модератор { reviewer.name }.</div> }

      <div className="ui-article__body"><PostMarkdown content={post.content} /></div>

      <PostGallery postId={post.id} title={post.title} images={await getPostImages(post.id)} />

      <div className="ui-actions">
        { post.status === 'draft'
          ? editPost(user, post) && <ButtonLink href={`/office/posts/${post.id}/edit`} leftSection={<IconPencil size={16} />}>
            Редактировать
          </ButtonLink>
          : <PostEditButton id={post.id} status={post.status} /> }
        <PostTransitionButtons post={resource(postTransitionsResource, {
          id: post.id,
          transitions: ownerTransitions(user, post)
        })} />
        { post.status === 'published' && <ButtonLink
          href={`/posts/${post.id}`}
          variant="default"
          leftSection={<IconExternalLink size={16} />}
        >
          На сайте
        </ButtonLink> }
      </div>
    </article>
  );
}
