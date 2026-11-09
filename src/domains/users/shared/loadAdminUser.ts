import 'server-only';
import { db } from "@/globals/db";
import { authorRequests, commentReports, comments, postModerations, postRatings, posts, userAdminActions, userFollows, users } from "@/database/schema";
import type { ModerationDecision, Role, UserAdminActionType } from "@/database/schema";
import { formatRating } from "@/domains/posts/exports/formatRating";
import { USER_ADMIN_ACTION_LABELS } from "@/domains/users/shared/userAdminActionLabels";
import { parseRoles } from "@/domains/users/shared/userRoles";
import { alias } from "drizzle-orm/sqlite-core";
import { and, avg, count, eq, isNotNull } from "drizzle-orm";

/*
  Карточка пользователя в админке (спека 42, шаг 19): сам пользователь, цифры шапки и
  «Последние действия». undefined — пользователя нет
*/
export async function loadAdminUser(id: number){
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });

  if(!user){
    return undefined;
  }

  return {
    user: { ...user, roles: parseRoles(user.roles) },
    stats: loadStats(id),
    events: loadEvents(id),
  };
}

export type AdminUserEvent = {
  key: string,
  tone: EventTone,
  text: string,
  comment: string | null,
  at: Date
}

export type AdminUserStats = ReturnType<typeof loadStats>;

type EventTone = 'coral' | 'mint' | 'plum' | 'faint';

/*
  Постов — всех статусов, как в списке пользователей; оценка — средняя по опубликованным,
  как на /authors; жалоб — на его комментарии за всё время
*/
function loadStats(id: number){
  const n = (row: { n: number } | undefined) => row?.n ?? 0;
  const rating = db.select({ average: avg(postRatings.value) })
    .from(postRatings)
    .innerJoin(posts, and(eq(posts.id, postRatings.postId), eq(posts.status, 'published')))
    .where(eq(posts.userId, id))
    .get()?.average;

  return {
    posts: n(db.select({ n: count() }).from(posts).where(eq(posts.userId, id)).get()),
    rating: rating == null ? null : formatRating(Number(rating)),
    followers: n(db.select({ n: count() }).from(userFollows).where(eq(userFollows.followingId, id)).get()),
    reports: n(db.select({ n: count() })
      .from(commentReports)
      .innerJoin(comments, eq(comments.id, commentReports.commentId))
      .where(eq(comments.userId, id))
      .get()),
  };
}

/*
  Лента из трёх журналов, свежие сверху: действия admin (user_admin_actions), решения
  модераторов по его постам (post_moderations) и решения по заявкам в авторы. Подписи без
  рода, как в журнале: «Заблокирован · Alice»
*/
function loadEvents(id: number): AdminUserEvent[] {
  const actor = alias(users, 'actor');
  const admin = db.select({
    id: userAdminActions.id,
    action: userAdminActions.action,
    role: userAdminActions.role,
    comment: userAdminActions.comment,
    at: userAdminActions.createdAt,
    actor: actor.name,
  })
    .from(userAdminActions)
    .innerJoin(actor, eq(actor.id, userAdminActions.actorId))
    .where(eq(userAdminActions.userId, id))
    .all();
  const moderations = db.select({
    id: postModerations.id,
    decision: postModerations.decision,
    comment: postModerations.comment,
    at: postModerations.createdAt,
    title: posts.title,
    actor: actor.name,
  })
    .from(postModerations)
    .innerJoin(posts, eq(posts.id, postModerations.postId))
    .innerJoin(actor, eq(actor.id, postModerations.userId))
    .where(eq(posts.userId, id))
    .all();
  const requests = db.select({
    id: authorRequests.id,
    status: authorRequests.status,
    reason: authorRequests.reason,
    at: authorRequests.decidedAt,
    actor: actor.name,
  })
    .from(authorRequests)
    .leftJoin(actor, eq(actor.id, authorRequests.decidedBy))
    .where(and(eq(authorRequests.userId, id), isNotNull(authorRequests.decidedAt)))
    .all();

  return [
    ...admin.map(a => ({
      key: `a${a.id}`,
      tone: ADMIN_TONES[a.action],
      text: `${USER_ADMIN_ACTION_LABELS[a.action]}${a.role ? ` «${ROLE_LABELS[a.role]}»` : ''} · ${a.actor}`,
      comment: a.comment,
      at: a.at,
    })),
    ...moderations.map(m => ({
      key: `m${m.id}`,
      tone: DECISIONS[m.decision].tone,
      text: `${DECISIONS[m.decision].label} пост «${m.title}» · ${m.actor}`,
      comment: m.comment,
      at: m.at,
    })),
    ...requests.flatMap(r => r.at ? [ {
      key: `r${r.id}`,
      tone: r.status === 'approved' ? 'mint' as const : 'faint' as const,
      text: `${r.status === 'approved' ? 'Одобрена' : 'Отклонена'} заявка в авторы${r.actor ? ` · ${r.actor}` : ''}`,
      comment: r.status === 'rejected' ? r.reason : null,
      at: r.at,
    } ] : []),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
}

const ROLE_LABELS: Record<Role, string> = { author: 'Автор', moderator: 'Модератор', admin: 'Администратор' };

const ADMIN_TONES: Record<UserAdminActionType, EventTone> = {
  banned: 'coral',
  unbanned: 'mint',
  role_granted: 'plum',
  role_revoked: 'faint',
  avatar_removed: 'coral',
  cover_removed: 'coral',
};

const DECISIONS: Record<ModerationDecision, { label: string, tone: EventTone }> = {
  approved: { label: 'Опубликован', tone: 'mint' },
  rejected: { label: 'Отклонён', tone: 'faint' },
  blocked: { label: 'Заблокирован', tone: 'coral' },
  unblocked: { label: 'Разблокирован', tone: 'mint' },
};
