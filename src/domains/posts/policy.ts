import { Post } from "@/database/types";
import { AuthUser } from "@/shared/authUser";
import { POST_OWNER_TRANSITIONS, POST_TRANSITIONS, PostOwnerTransition, PostTransition } from "@/domains/posts/shared/postStatuses";

export function createPost(user: AuthUser){
  return user.roles.includes('author');
}

/*
  Права автора поста: владелец или admin
*/
export function workWithPost(user: AuthUser, post: Pick<Post, 'userId'>){
  return user.id === post.userId || user.roles.includes('admin');
}

export function editPost(user: AuthUser, post: Pick<Post, 'userId' | 'status'>){
  return workWithPost(user, post) && post.status === 'draft';
}

export function moderatePosts(user: AuthUser){
  return user.roles.includes('moderator') || user.roles.includes('admin');
}

export function adminPosts(user: AuthUser){
  return user.roles.includes('admin');
}

/*
  Только права на переход, без статуса: статус проверяет сам переход атомарно,
  чтобы устаревшая страница получила ошибку, а не 403
*/
export function transitPost(user: AuthUser, post: Pick<Post, 'userId'>, transition: PostTransition){
  return POST_TRANSITIONS[transition].by === 'moderator' ? moderatePosts(user) : workWithPost(user, post);
}

/*
  Переходы автора, доступные посту в текущем статусе — для кнопок в кабинете
*/
export function ownerTransitions(user: AuthUser, post: Pick<Post, 'userId' | 'status'>): PostOwnerTransition[] {
  return POST_OWNER_TRANSITIONS.filter(t => POST_TRANSITIONS[t].from === post.status && transitPost(user, post, t));
}

/*
  Оценивать можно только опубликованный и не свой пост: своя рука смещала бы среднюю автора
*/
export function ratePost(user: AuthUser, post: Pick<Post, 'userId' | 'status'>){
  return post.status === 'published' && post.userId !== user.id;
}

/*
  Решение по посту в очереди: пост никто не взял на ревью или взял я. admin решает всегда —
  это и есть перехват зависшего ревью
*/
export function decidePostModeration(user: AuthUser, post: Pick<Post, 'reviewerId'>){
  return moderatePosts(user) && (post.reviewerId === null || post.reviewerId === user.id || adminPosts(user));
}
