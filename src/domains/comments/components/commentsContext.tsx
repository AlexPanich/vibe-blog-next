'use client'

import 'client-only';
import type { CommentReportState, CommentViewer } from "@/domains/comments/dto/commentResources";
import type { AuthUser } from "@/shared/authUser";
import { createContext, useContext } from "react";

export type CommentsContextValue = {
  postId: number,
  imageId: number | null,
  // Автор поста может жаловаться на любой комментарий под ним
  postAuthorId: number,
  user: AuthUser | null,
  viewer: CommentViewer,
  // Пока «своё» не пришло, состояние жалобы неизвестно — кнопку не рисуем, чтобы не мигала
  viewerLoaded: boolean,
  setReaction: (id: number, mine: 1 | -1 | 0) => void,
  setHidden: (id: number, hidden: { content: string, reason: string } | null) => void,
  setReport: (id: number, state: CommentReportState) => void
}

export const CommentsContext = createContext<CommentsContextValue | null>(null);

// Ветка рекурсивная — общее состояние блока идёт контекстом, а не пропсами через все уровни
export function useCommentsContext(){
  const value = useContext(CommentsContext);

  if(!value){
    throw new Error('CommentItem вне CommentsBlock');
  }

  return value;
}
