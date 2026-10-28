import 'server-only';
import { db } from "@/globals/db";
import { authorRequests } from "@/database/schema";
import type { AuthorRequest } from "@/database/types";
import { deleteAuthorRequestNotifications, type DBTransaction } from "@/domains/notifications/exports/notify";
import { AUTHOR_REQUEST_PAUSE_DAYS } from "@/domains/users/dto/authorRequestRequests";
import { and, count, desc, eq } from "drizzle-orm";

export type AuthorRequestState = {
  pending: AuthorRequest | null,
  // Последняя решённая — для «отклонена: причина» и паузы
  last: AuthorRequest | null,
  // Когда можно подать новую; null — можно сейчас (или уже ждёт рассмотрения)
  nextAt: Date | null
}

export function authorRequestState(userId: number, tx: Pick<DBTransaction, 'select'> = db): AuthorRequestState {
  const pending = tx.select().from(authorRequests).where(and(eq(authorRequests.userId, userId), eq(authorRequests.status, 'pending'))).get() ?? null;
  const last = tx.select().from(authorRequests)
    .where(and(eq(authorRequests.userId, userId), eq(authorRequests.status, 'rejected')))
    .orderBy(desc(authorRequests.decidedAt), desc(authorRequests.id))
    .get() ?? null;

  return { pending, last, nextAt: pauseEnd(last) };
}

export function countPendingAuthorRequests(){
  return db.select({ n: count() }).from(authorRequests).where(eq(authorRequests.status, 'pending')).get()?.n ?? 0;
}

/*
  Роль автора выдали руками в форме ролей: ожидающая заявка закрывается одобренной тем же
  admin, задача у admin-ов уходит
*/
export function closePendingAuthorRequest(tx: DBTransaction, userId: number, actorId: number){
  const closed = tx.update(authorRequests)
    .set({ status: 'approved', decidedBy: actorId, decidedAt: new Date() })
    .where(and(eq(authorRequests.userId, userId), eq(authorRequests.status, 'pending')))
    .returning({ id: authorRequests.id })
    .all();

  if(closed.length > 0){
    deleteAuthorRequestNotifications(tx, userId);
  }
}

function pauseEnd(last: AuthorRequest | null): Date | null {
  if(!last?.decidedAt){
    return null;
  }

  const end = new Date(last.decidedAt.getTime() + AUTHOR_REQUEST_PAUSE_DAYS * 24 * 60 * 60 * 1000);

  return end > new Date() ? end : null;
}
