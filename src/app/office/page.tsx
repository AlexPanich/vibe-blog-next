import { db } from "@/globals/db";
import { notifications, posts, tagFollows, userFollows, users } from "@/database/schema";
import { requireAuthUser } from "@/shared/auth";
import { resource } from "@/core/resource";
import { plural } from "@/core/plural";
import ButtonLink from "@/components/general/ButtonLink";
import LocalDate from "@/components/general/LocalDate";
import OfficeSectionChips from "@/components/navigation/OfficeSectionChips";
import OfficeStaffLine from "@/components/office/OfficeStaffLine";
import OfficeStartSteps, { type OfficeStep } from "@/components/office/OfficeStartSteps";
import OfficeStatTiles from "@/components/office/OfficeStatTiles";
import { getOfficeMenu } from "@/components/navigation/getOfficeMenu";
import RecentPosts, { RECENT_POST_TABS } from "@/domains/posts/components/RecentPosts";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withRowData } from "@/domains/posts/shared/postRows";
import { authorStats } from "@/domains/posts/shared/authorStats";
import { createPost, moderatePosts } from "@/domains/posts/policy";
import { moderateComments } from "@/domains/comments/exports/countOpenCommentReports";
import { manageUsers } from "@/domains/users/exports/authorRequests";
import { authorRequestState } from "@/domains/users/shared/authorRequests";
import { followerStats } from "@/domains/users/shared/followerStats";
import NotificationDigest from "@/domains/notifications/components/NotificationDigest";
import { notificationItemResource } from "@/domains/notifications/dto/notificationResources";
import { loadNotificationRows, toNotificationItem } from "@/domains/notifications/shared/loadNotifications";
import DialogDigest from "@/domains/messages/components/DialogDigest";
import { loadDialogRows } from "@/domains/messages/shared/loadMessages";
import { and, count, desc, eq } from "drizzle-orm";
import { IconHourglass, IconLock, IconNews, IconPencilPlus, IconUserCircle, IconUsersGroup } from "@tabler/icons-react";
import z from "zod";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Начало' };

const RECENT_POSTS = 4;
const RECENT_NOTIFICATIONS = 4;
const RECENT_DIALOGS = 3;

const startDto = z.object({ posts: z.enum(RECENT_POST_TABS).optional().catch(undefined) });

/*
  «Начало» кабинета (спека 42, шаг 2): приветствие, строка модерации для staff, плитки цифр
  автора, «С чего начать» (спека 27), последние посты и справа уведомления с сообщениями
*/
export default async function OfficeStart({ searchParams }: PageProps<'/office'>) {
  const user = await requireAuthUser();
  const { posts: tab } = startDto.parse(await searchParams);
  const menu = await getOfficeMenu();
  const isAuthor = createPost(user);
  const isStaff = moderatePosts(user) || manageUsers(user);
  const stats = isAuthor ? authorStats(user.id) : null;
  const followers = isAuthor ? followerStats(user.id) : null;
  const hasPosts = (stats?.total ?? 0) > 0;
  const recent = hasPosts
    ? await withRowData(await db.query.posts.findMany({
      where: and(eq(posts.userId, user.id), tab ? eq(posts.status, tab) : undefined),
      orderBy: desc(posts.createdAt),
      limit: RECENT_POSTS,
      with: POST_TAGS_WITH
    }))
    : [];
  const notificationItems = loadNotificationRows(eq(notifications.userId, user.id), RECENT_NOTIFICATIONS).map(toNotificationItem);
  const dialogs = loadDialogRows(user.id).items.slice(0, RECENT_DIALOGS);
  const steps = await startSteps(user.id, isAuthor, stats?.total ?? 0);

  return (
    <>
      <div className="ui-start-hello">
        <div>
          <p className="ui-start-hello__date"><LocalDate value={new Date()} options={{ weekday: 'long', day: 'numeric', month: 'long' }} /></p>
          <h1 className="ui-start-hello__title">Привет, { user.name.split(' ')[0] }!</h1>
          { followers && stats && <p className="ui-start-hello__sub">{ weekSummary(followers.week, stats.comments.week) }</p> }
        </div>
        <div className="ui-start-hello__actions">
          <ButtonLink href="/office/feed" variant="default" leftSection={<IconNews size={16} />}>Моя лента</ButtonLink>
          { isAuthor && <ButtonLink href="/office/posts/create" leftSection={<IconPencilPlus size={16} />}>Новый пост</ButtonLink> }
        </div>
      </div>

      <OfficeSectionChips menu={menu} />

      { isStaff && <OfficeStaffLine
        moderating={moderatePosts(user) ? menu.counts.moderating : null}
        reports={moderateComments(user) ? menu.counts.reports : null}
        authorRequests={manageUsers(user) ? menu.counts.authorRequests : null}
      /> }

      { stats && followers && <OfficeStatTiles followers={followers} rating={stats.rating} comments={stats.comments} /> }

      { steps.length > 0 && <OfficeStartSteps steps={steps} /> }

      {/* Без своих постов уведомления и сообщения встают в две колонки на всю ширину */}
      <div className="ui-start-columns" data-solo={!hasPosts}>
        { stats && hasPosts && <div className="ui-start-columns__main">
          <RecentPosts
            posts={recent.map(post => ({ ...post, tags: pickTags(post) }))}
            statuses={stats.statuses}
            total={stats.total}
            tab={tab ?? null}
          />
        </div> }
        <aside className="ui-start-columns__side">
          <NotificationDigest items={resource(z.array(notificationItemResource), notificationItems)} unread={menu.counts.notifications} />
          <DialogDigest dialogs={dialogs} unread={menu.counts.messages} />
        </aside>
      </div>
    </>
  );
}

/*
  Шаг виден, пока не сделан по факту — флага «уже показывали» нет: появился первый пост,
  подписка, аватар с «о себе» — карточка уходит сама (спека 27)
*/
async function startSteps(userId: number, isAuthor: boolean, postsTotal: number): Promise<OfficeStep[]> {
  const [ { total: authorsTotal } ] = await db.select({ total: count() }).from(userFollows).where(eq(userFollows.followerId, userId));
  const [ { total: tagsTotal } ] = await db.select({ total: count() }).from(tagFollows).where(eq(tagFollows.userId, userId));
  const profile = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { bio: true, avatarKey: true } });
  const steps: OfficeStep[] = [];

  if(!isAuthor){
    steps.push(roleStep(userId));
  }
  else if(postsTotal === 0){
    steps.push({
      key: 'post',
      icon: IconPencilPlus,
      title: 'Первый пост',
      text: 'Пост уходит на проверку модератору — читатели увидят его после публикации.',
      action: { label: 'Написать', href: '/office/posts/create' }
    });
  }

  if(authorsTotal + tagsTotal === 0){
    steps.push({
      key: 'follow',
      icon: IconUsersGroup,
      title: 'Подпишитесь на авторов',
      text: 'Их новые посты соберутся в «Моей ленте». На рубрику подписываются в общей ленте — под фильтром рубрик.',
      action: { label: 'К авторам', href: '/authors' }
    });
  }

  if(!profile?.avatarKey || !profile.bio){
    steps.push({
      key: 'profile',
      icon: IconUserCircle,
      title: 'Расскажите о себе',
      text: 'Аватар и пара строк «О себе» видны на вашей странице автора и рядом с комментариями.',
      action: { label: 'В профиль', href: '/office/profile' }
    });
  }

  return steps;
}

// Без роли автора — по состоянию заявки (спека 28)
function roleStep(userId: number): OfficeStep {
  const { pending, last, nextAt } = authorRequestState(userId);
  const open = { label: 'Открыть заявку', href: '/office/author-request' } as const;

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
    action: { label: 'Подать заявку', href: '/office/author-request' }
  };
}

// Подзаголовок приветствия: в макете — просмотры за неделю, их пока нет (спека 43)
function weekSummary(followers: number, comments: number){
  if(followers === 0 && comments === 0){
    return 'За неделю новых подписчиков и комментариев не было';
  }

  const parts = [
    followers > 0 && `+${followers} ${plural(followers, [ 'подписчик', 'подписчика', 'подписчиков' ])}`,
    comments > 0 && `${comments} ${plural(comments, [ 'новый комментарий', 'новых комментария', 'новых комментариев' ])}`,
  ].filter(Boolean);

  return `За неделю: ${parts.join(', ')}`;
}
