import { resource } from "@/core/resource";
import { plural } from "@/core/plural";
import { postFavoriteListResource } from "@/domains/posts/dto/postResources";
import { loadFavorites } from "@/domains/posts/shared/loadFavorites";
import PostFavoriteGrid from "@/domains/posts/components/PostFavoriteGrid";
import OfficeHead from "@/components/layout/OfficeHead";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import { requireAuthUser } from "@/shared/auth";
import { IconBookmark } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Избранное' };

export default async function OfficeFavorites() {
  const user = await requireAuthUser();
  const list = await loadFavorites(user.id);

  if(list.length === 0){
    return (
      <>
        <OfficeHead title="Избранное" />
        <EmptyState
          icon={IconBookmark}
          title="Вы пока ничего не отложили"
          action={<ButtonLink href="/posts" variant="default">В ленту</ButtonLink>}
        >
          Добавить в избранное можно кнопкой «В избранное» на странице поста.
        </EmptyState>
      </>
    );
  }

  const n = list.length;

  return (
    <>
      <OfficeHead
        title="Избранное"
        sub={`${n} ${plural(n, [ 'отложенный пост', 'отложенных поста', 'отложенных постов' ])} — видите только вы`}
      />
      <PostFavoriteGrid list={resource(postFavoriteListResource, list)} />
    </>
  );
}
