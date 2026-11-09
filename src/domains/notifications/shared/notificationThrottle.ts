import 'server-only';
import { notificationThrottles, type ThrottleKind } from "@/database/schema";
import { notify, type DBTransaction, type NotifyTarget } from "@/domains/notifications/shared/notify";
import { and, eq } from "drizzle-orm";

// Оценка одного поста одним человеком уведомляет автора не чаще раза в сутки (спека 51, реш. 4)
export const RATE_THROTTLE_MS = 24 * 3600_000;

/*
  Пара актор–цель (спека 51, реш. 4): rate — раз в сутки, follow — один раз навсегда. Память
  обновляется, только если уведомление создано: заблокированный актор её не тратит
*/
export function notifyThrottled(tx: DBTransaction, type: 'post.rated' | 'user.followed', recipientId: number, target: NotifyTarget & { actorId: number }, throttle: { kind: ThrottleKind, targetId: number }): number[] {
  const key = and(
    eq(notificationThrottles.actorId, target.actorId),
    eq(notificationThrottles.kind, throttle.kind),
    eq(notificationThrottles.targetId, throttle.targetId)
  );
  const last = tx.select({ notifiedAt: notificationThrottles.notifiedAt }).from(notificationThrottles).where(key).get();

  if(last && (throttle.kind === 'follow' || Date.now() - last.notifiedAt.getTime() < RATE_THROTTLE_MS)){
    return [];
  }

  const ids = notify(tx, type, [ recipientId ], target);

  if(ids.length > 0){
    const notifiedAt = new Date();

    tx.insert(notificationThrottles)
      .values({ actorId: target.actorId, kind: throttle.kind, targetId: throttle.targetId, notifiedAt })
      .onConflictDoUpdate({ target: [ notificationThrottles.actorId, notificationThrottles.kind, notificationThrottles.targetId ], set: { notifiedAt } })
      .run();
  }

  return ids;
}
