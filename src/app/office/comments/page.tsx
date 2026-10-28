import { db } from "@/globals/db";
import { comments, posts } from "@/database/schema";
import { requireAuthUser } from "@/shared/auth";
import { resource } from "@/core/resource";
import LocalDate from "@/components/general/LocalDate";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import ReceivedCommentList from "@/domains/comments/components/ReceivedCommentList";
import { receivedCommentListResource } from "@/domains/comments/dto/commentResources";
import { countReceivedComments, loadReceivedComments } from "@/domains/comments/shared/loadReceivedComments";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { IconCalendar, IconMessage } from "@tabler/icons-react";
import z from "zod";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Комментарии' };

const TABS = {
  mine: {
    label: 'Мои',
    empty: { title: 'Вы ещё ничего не комментировали', text: 'Обсудить пост можно под ним — форма комментария внизу страницы поста.' }
  },
  received: {
    label: 'К моим постам',
    empty: { title: 'Комментариев к вашим постам пока нет', text: 'Когда читатели ответят под вашими опубликованными постами, комментарии соберутся здесь.' }
  },
} as const;

type Tab = keyof typeof TABS

const tabDto = z.object({ tab: z.enum([ 'mine', 'received' ]).catch('mine').default('mine') });

export default async function OfficeComments({ searchParams }: PageProps<'/office/comments'>) {
  const user = await requireAuthUser();
  const { tab } = tabDto.parse(await searchParams);
  const [ mineTotal, receivedTotal ] = await Promise.all([ countMine(user.id), countReceivedComments(user.id) ]);
  const totals: Record<Tab, number> = { mine: mineTotal, received: receivedTotal };

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Комментарии</h1>
        <span className="ui-kicker">Всего: { totals[tab] }</span>
      </div>

      <nav className="ui-filter">
        { (Object.keys(TABS) as Tab[]).map(t => (
          <Link key={t} href={t === 'mine' ? '/office/comments' : `/office/comments?tab=${t}`} data-active={t === tab}>
            { TABS[t].label } · { totals[t] }
          </Link>
        )) }
      </nav>

      { totals[tab] === 0 ? (
        <EmptyState
          icon={IconMessage}
          title={TABS[tab].empty.title}
          action={tab === 'mine' && <ButtonLink href="/posts" variant="default">В ленту</ButtonLink>}
        >
          { TABS[tab].empty.text }
        </EmptyState>
      ) : tab === 'received' ? <ReceivedTab userId={user.id} /> : <MineTab userId={user.id} /> }
    </>
  );
}

// Только к опубликованным постам и без удалённых — как избранное
async function MineTab({ userId }: { userId: number }){
  const list = await db.select({
    id: comments.id,
    content: comments.content,
    createdAt: comments.createdAt,
    hiddenAt: comments.hiddenAt,
    hideReason: comments.hideReason,
    imageId: comments.imageId,
    postId: posts.id,
    postTitle: posts.title
  })
    .from(comments)
    .innerJoin(posts, mineJoin())
    .where(mineWhere(userId))
    .orderBy(desc(comments.createdAt), desc(comments.id));

  return (
    <div className="ui-rows">
      { list.map(comment => (
        <div key={comment.id} className="ui-row">
          <div className="ui-row__body">
            <h3 className="ui-row__title">
              <Link href={commentHref(comment)}>{ comment.postTitle }</Link>
              { comment.imageId && <span className="ui-kicker"> · к фото</span> }
            </h3>
            <p className="ui-row__excerpt">{ comment.content }</p>
            { comment.hiddenAt && <div className="ui-note ui-note--danger">
              <span className="ui-note__label">Скрыт модератором</span>
              { comment.hideReason }
            </div> }
          </div>
          <div className="ui-row__aside">
            <span className="ui-meta ui-meta__item">
              <IconCalendar size={13} stroke={1.8} />
              <LocalDate value={comment.createdAt} options={{ dateStyle: 'medium' }} />
            </span>
          </div>
        </div>
      )) }
    </div>
  );
}

async function ReceivedTab({ userId }: { userId: number }){
  const { items, hasMore } = await loadReceivedComments(userId);

  return <ReceivedCommentList initial={resource(receivedCommentListResource, items)} hasMore={hasMore} />;
}

async function countMine(userId: number){
  const [ { total } ] = await db.select({ total: count() }).from(comments).innerJoin(posts, mineJoin()).where(mineWhere(userId));

  return total;
}

function mineJoin(){
  return and(eq(posts.id, comments.postId), eq(posts.status, 'published'));
}

function mineWhere(userId: number){
  return and(eq(comments.userId, userId), isNull(comments.deletedAt));
}

// Комментарий к картинке живёт на её странице
function commentHref({ id, postId, imageId }: { id: number, postId: number, imageId: number | null }){
  return imageId
    ? `/posts/${postId}/images/${imageId}#comment-${id}` as const
    : `/posts/${postId}#comment-${id}` as const;
}
