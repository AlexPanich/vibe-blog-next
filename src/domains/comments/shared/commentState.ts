import type { Comment } from "@/database/types";

export const COMMENT_STATES = [ 'visible', 'hidden', 'deleted' ] as const;

export type CommentState = (typeof COMMENT_STATES)[number];

export function commentState(comment: Pick<Comment, 'hiddenAt' | 'deletedAt'>): CommentState {
  if(comment.deletedAt){
    return 'deleted';
  }
  else if(comment.hiddenAt){
    return 'hidden';
  }

  return 'visible';
}
