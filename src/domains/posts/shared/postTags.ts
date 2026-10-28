import { sortTags } from "@/domains/tags/exports/tagNames";
import type { Tag } from "@/database/types";

/*
  Рубрики поста для запросов: with: { ...POST_TAGS_WITH }, затем pickTags(post).
  В ресурсы уходят уже отсортированными
*/
export const POST_TAGS_WITH = { postTags: { with: { tag: true } } } as const;

export function pickTags(post: { postTags: { tag: Tag }[] }){
  return sortTags(post.postTags.map(pt => pt.tag));
}
