import type { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";

/*
  «Чистая» лента — /posts без условий и с сортировкой «Новые». Только здесь новый пост
  гарантированно встанет первым, поэтому только здесь плашка «Новые посты» (спека 22)
*/
export function isPlainFeed(filter: PostFeedFilterDto){
  return !filter.follow && !filter.search && !filter.type && !filter.author && !filter.period && filter.tag.length === 0 && filter.sort === 'new';
}
