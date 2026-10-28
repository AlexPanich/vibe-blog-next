import { db } from "@/globals/db";
import { posts, tagFollows, userFollows, users } from "@/database/schema";
import { requireAuthUser } from "@/shared/auth";
import ButtonLink from "@/components/general/ButtonLink";
import LocalDate from "@/components/general/LocalDate";
import PostRow from "@/domains/posts/components/PostRow";
import { createPost, moderatePosts } from "@/domains/posts/policy";
import { countOpenCommentReports, moderateComments } from "@/domains/comments/exports/countOpenCommentReports";
import { authorRequestState } from "@/domains/users/shared/authorRequests";
import { count, desc, eq } from "drizzle-orm";
import Link from "@/components/general/Link";
import type { ReactNode } from "react";
import { IconHourglass, IconLock, IconPencilPlus, IconUserCircle, IconUsersGroup, type Icon } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Начало' };

type Step = { key: string, icon: Icon, title: string, text: ReactNode, action: ReactNode }

const RECENT_POSTS = 3;

/*
  «С чего начать» (спека 27). Шаг виден, пока не сделан по факту — флага «уже показывали»
  нет: появился первый пост, подписка, аватар с «о себе» — карточка уходит сама
*/
export default async function OfficeStart() {
  const user = await requireAuthUser();
  const isAuthor = createPost(user);
  const [ { total: postsTotal } ] = await db.select({ total: count() }).from(posts).where(eq(posts.userId, user.id));
  const [ { total: authorsTotal } ] = await db.select({ total: count() }).from(userFollows).where(eq(userFollows.followerId, user.id));
  const [ { total: tagsTotal } ] = await db.select({ total: count() }).from(tagFollows).where(eq(tagFollows.userId, user.id));
  const profile = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { bio: true, avatarKey: true } });
  const recent = isAuthor && postsTotal > 0
    ? await db.query.posts.findMany({ where: eq(posts.userId, user.id), orderBy: desc(posts.createdAt), limit: RECENT_POSTS })
    : [];
  const steps: Step[] = [];

  if(!isAuthor){
    steps.push(roleStep(user.id));
  }
  else if(postsTotal === 0){
    steps.push({
      key: 'post',
      icon: IconPencilPlus,
      title: 'Начните с первого поста',
      text: 'Пост уходит на проверку модератору — читатели увидят его после публикации.',
      action: <ButtonLink href="/office/posts/create" size="xs" leftSection={<IconPencilPlus size={14} />}>Написать первый пост</ButtonLink>
    });
  }

  if(authorsTotal + tagsTotal === 0){
    steps.push({
      key: 'follow',
      icon: IconUsersGroup,
      title: 'Подпишитесь на авторов',
      text: 'Их новые посты соберутся в «Моей ленте». На рубрику подписываются в общей ленте — под фильтром рубрик.',
      action: <ButtonLink href="/authors" size="xs" variant="default">К авторам</ButtonLink>
    });
  }

  if(!profile?.avatarKey || !profile.bio){
    steps.push({
      key: 'profile',
      icon: IconUserCircle,
      title: 'Расскажите о себе',
      text: 'Аватар и пара строк «О себе» видны на вашей странице автора и рядом с комментариями.',
      action: <ButtonLink href="/office/profile" size="xs" variant="default">В профиль</ButtonLink>
    });
  }

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Начало</h1>
      </div>

      { moderatePosts(user) && <StaffLine reports={moderateComments(user)} /> }

      { steps.length > 0 && (
        <section className="ui-steps">
          <p className="ui-kicker">С чего начать</p>
          <div className="ui-grid">
            { steps.map(step => (
              <div key={step.key} className="ui-card">
                <h2 className="ui-card__title"><step.icon size={20} stroke={1.7} />{ step.title }</h2>
                <p className="ui-card__text">{ step.text }</p>
                <div className="ui-card__foot">{ step.action }</div>
              </div>
            )) }
          </div>
        </section>
      ) }

      { recent.length > 0 && <>
        <div className="ui-section-head">
          <h2 className="ui-panel__title">Мои посты</h2>
          <ButtonLink href="/office/posts/create" size="sm" leftSection={<IconPencilPlus size={16} />}>
            Новый пост
          </ButtonLink>
        </div>
        <div className="ui-rows">
          { recent.map(post => <PostRow key={post.id} post={post} href={`/office/posts/${post.id}`} />) }
        </div>
        { postsTotal > recent.length && <p className="ui-meta"><Link href="/office/posts">Все посты · { postsTotal }</Link></p> }
      </> }
    </>
  );
}

// Без роли автора — по состоянию заявки (спека 28)
function roleStep(userId: number): Step {
  const { pending, last, nextAt } = authorRequestState(userId);
  const open = <ButtonLink href="/office/author-request" size="xs" variant="default">Открыть заявку</ButtonLink>;

  if(pending){
    return {
      key: 'role',
      icon: IconHourglass,
      title: 'Заявка в авторы на рассмотрении',
      text: 'Администратор ответит уведомлением. Пока можно читать ленту, комментировать и подписываться на авторов.',
      action: open
    };
  }

  if(nextAt && last){
    return {
      key: 'role',
      icon: IconLock,
      title: 'Заявка в авторы отклонена',
      text: <>Причина: «{ last.reason }». Новую можно подать с <LocalDate value={nextAt} options={{ dateStyle: 'long' }} /></>,
      action: open
    };
  }

  return {
    key: 'role',
    icon: IconLock,
    title: 'Писать посты могут авторы',
    text: 'Роль автора выдаёт администратор — расскажите в заявке, о чём хотите писать. Пока можно читать ленту, комментировать и подписываться на авторов.',
    action: <ButtonLink href="/office/author-request" size="xs">Подать заявку</ButtonLink>
  };
}

// Вход в очереди для staff: только числа и ссылки, сами очереди здесь не повторяются
async function StaffLine({ reports }: { reports: boolean }){
  const [ { total: moderating } ] = await db.select({ total: count() }).from(posts).where(eq(posts.status, 'moderating'));

  return (
    <p className="ui-start-line">
      <Link href="/office/moderation/posts">На проверке: { moderating }</Link>
      { reports && <Link href="/office/moderation/comments">Жалоб: { await countOpenCommentReports() }</Link> }
    </p>
  );
}
