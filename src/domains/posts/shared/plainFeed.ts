import type { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { feedPeriod } from "@/domains/posts/shared/feedPeriod";

/*
  «Чистая» лента — /posts без условий и с сортировкой «Новые». Только здесь новый пост
  гарантированно встанет первым, поэтому только здесь плашка «Новые посты» (спека 22)
*/
export function isPlainFeed(filter: PostFeedFilterDto){
  return !filter.follow && !filter.search && !filter.type && !filter.author && feedPeriod(filter) === 'all' && filter.tag.length === 0 && filter.sort === 'new';
}
