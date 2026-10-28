import type { CommentResource } from "@/domains/comments/dto/commentResources";

// До какого уровня (корень — 0) растёт отступ; глубже — без нового отступа, с пометкой «→ имя». На узком экране — раньше
export const INDENT_LEVELS = 5;

export const INDENT_LEVELS_SM = 3;

export type CommentNode = CommentResource & { replies: CommentNode[] }

/*
  Плоский список (старые сверху) в дерево. Ответ на отсутствующего родителя — в корень:
  дерево не теряет ветку, даже если данные разошлись
*/
export function buildCommentTree(flat: CommentResource[]): CommentNode[] {
  const nodes = new Map(flat.map(c => [ c.id, { ...c, replies: [] as CommentNode[] } ]));
  const roots: CommentNode[] = [];

  for(const node of nodes.values()){
    const parent = node.parentId === null ? undefined : nodes.get(node.parentId);

    if(parent){
      parent.replies.push(node);
    }
    else{
      roots.push(node);
    }
  }

  return roots;
}

export function commentsCountLabel(n: number){
  const mod10 = n % 10;
  const mod100 = n % 100;

  if(mod10 === 1 && mod100 !== 11){
    return `${n} комментарий`;
  }
  else if(mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)){
    return `${n} комментария`;
  }

  return `${n} комментариев`;
}
