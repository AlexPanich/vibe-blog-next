import 'server-only';
import { db } from "@/globals/db";
import { postModerations } from "@/database/schema";
import type { PostStatus } from "@/database/schema";
import { withCardData } from "@/domains/posts/shared/postCards";
import { desc, inArray } from "drizzle-orm";

type RowSource = { id: number, status: PostStatus, content: string, coverImageId: number | null };

/*
  Всё для строки поста в кабинете (спека 42): то же, что карточке (обложка, оценка,
  комментарии), и замечание модератора у отклонённого или заблокированного
*/
export async function withRowData<T extends RowSource>(posts: T[]){
  const rows = await withCardData(posts);
  const notes = await moderationNotes(rows.filter(p => p.status === 'rejected' || p.status === 'blocked').map(p => p.id));

  return rows.map(post => ({ ...post, note: notes.get(post.id) ?? null }));
}

export type PostRowData = Awaited<ReturnType<typeof withRowData<RowSource>>>[number];

// Комментарий последнего решения, если это отказ или блокировка
async function moderationNotes(postIds: number[]){
  const notes = new Map<number, string>();

  if(postIds.length === 0){
    return notes;
  }

  const rows = await db.select({ postId: postModerations.postId, decision: postModerations.decision, comment: postModerations.comment })
    .from(postModerations)
    .where(inArray(postModerations.postId, postIds))
    .orderBy(desc(postModerations.id));
  const seen = new Set<number>();

  for(const row of rows){
    if(seen.has(row.postId)){
      continue;
    }

    seen.add(row.postId);

    if((row.decision === 'rejected' || row.decision === 'blocked') && row.comment){
      notes.set(row.postId, row.comment);
    }
  }

  return notes;
}
