import 'server-only';
import { postModerations } from "@/database/schema";
import type { DBTransaction } from "@/domains/notifications/exports/notify";

// Запись о блокировке в историю модерации — со страницы модерации и из очереди жалоб
export function insertBlockModeration(tx: DBTransaction, postId: number, userId: number, comment: string){
  tx.insert(postModerations).values({ postId, userId, decision: 'blocked', comment }).run();
}
