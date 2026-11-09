import { resource } from "@/core/resource";
import { plural } from "@/core/plural";
import { postFavoriteListResource } from "@/domains/posts/dto/postResources";
import { loadFavorites } from "@/domains/posts/shared/loadFavorites";
import PostFavoriteGrid from "@/domains/posts/components/PostFavoriteGrid";
import OfficeHead from "@/components/layout/OfficeHead";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import Link from "@/components/general/Link";
import { requireAuthUser } from "@/shared/auth";
import { db } from "@/globals/db";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { IconBookmark } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Избранное' };

export default async function OfficeFavorites() {
  const user = await requireAuthUser();
  const [ list, settings ] = await Promise.all([
    loadFavorites(user.id),
    db.query.users.findFirst({ where: eq(users.id, user.id), columns: { favoritesPublic: true } })
  ]);

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
  const count = `${n} ${plural(n, [ 'отложенный пост', 'отложенных поста', 'отложенных постов' ])}`;

  return (
    <>
      <OfficeHead
        title="Избранное"
        // Кто видит избранное и где это настроить (спека 40)
        sub={settings?.favoritesPublic ? (
          <>{ count } — видно всем на <Link href={`/authors/${user.id}?tab=favorites`}>вашей странице</Link> · <Link href="/office/profile#favorites">Настроить</Link></>
        ) : (
          <>{ count } — видите только вы · <Link href="/office/profile#favorites">Показать в профиле</Link></>
        )}
      />
      <PostFavoriteGrid list={resource(postFavoriteListResource, list)} />
    </>
  );
}
