'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { PostFavoriteListResource } from "@/domains/posts/dto/postResources";
import PostCard from "@/domains/posts/components/PostCard";
import PostFavoriteRemove from "@/domains/posts/components/PostFavoriteRemove";
import ClientValue from "@/components/general/ClientValue";
import { dayDiff } from "@/shared/localDays";

type PostFavoriteGridProps<T extends PostFavoriteListResource> = {
  list: StrictResource<T, PostFavoriteListResource>
}

/*
  Избранное (спека 42, шаг 8): карточки ленты, под каждой — когда отложен и «Убрать».
  На телефоне карточка сворачивается в строку CSS-ом (.ui-fav), разметка та же
*/
export default function PostFavoriteGrid<T extends PostFavoriteListResource>({ list }: PostFavoriteGridProps<T>) {
  return (
    <div className="ui-post-grid ui-fav-grid">
      { list.map(({ post, addedAt }) => (
        <div key={post.id} className="ui-fav">
          <PostCard post={post} />
          <div className="ui-fav__foot">
            <span className="ui-fav__added">
              Добавлен <time dateTime={addedAt.toISOString()}>
                <ClientValue server={addedAt.toISOString().slice(0, 10)} client={() => addedLabel(addedAt)} />
              </time>
            </span>
            <PostFavoriteRemove id={post.id} />
          </div>
        </div>
      )) }
    </div>
  );
}

// «сегодня», «вчера», «3 нояб.» — по часам браузера
function addedLabel(value: Date){
  const days = dayDiff(value);

  if(days === 0){
    return 'сегодня';
  }
  else if(days === 1){
    return 'вчера';
  }

  return value.toLocaleDateString('ru', { day: 'numeric', month: 'short', year: value.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}
