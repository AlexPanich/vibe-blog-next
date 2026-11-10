import { resource } from "@/core/resource";
import { plural } from "@/core/plural";
import { postFavoriteListResource } from "@/domains/posts/dto/postResources";
import { favoriteFilterDto } from "@/domains/posts/dto/postFavoriteRequests";
import { countFavorites, countFavoriteTags, loadFavorites } from "@/domains/posts/shared/loadFavorites";
import { favoritesUrl } from "@/domains/posts/shared/favoritesUrl";
import PostFavoriteGrid from "@/domains/posts/components/PostFavoriteGrid";
import PostFavoriteSortMenu from "@/domains/posts/components/PostFavoriteSortMenu";
import PostMoreTab from "@/domains/posts/components/PostMoreTab";
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

// Как в макете — шесть вкладок рубрик, остальные в «Ещё ▾»
const FAVORITE_MAIN_TABS = 6;

/*
  Избранное (спеки 10, 40, 44): вкладки по рубрикам с числами (?tag=), сортировка (?sort=).
  Рубрика, которой нет среди отложенных постов, — «Все»
*/
export default async function OfficeFavorites({ searchParams }: PageProps<'/office/favorites'>) {
  const user = await requireAuthUser();
  const parsed = favoriteFilterDto.parse(await searchParams);
  const [ tagsCount, total, settings ] = await Promise.all([
    countFavoriteTags(user.id),
    countFavorites(user.id),
    db.query.users.findFirst({ where: eq(users.id, user.id), columns: { favoritesPublic: true } })
  ]);

  if(total === 0){
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

  const tag = tagsCount.find(t => t.slug === parsed.tag);
  const filter = { ...parsed, tag: tag?.slug };
  const list = await loadFavorites(user.id, { tagId: tag?.id, sort: filter.sort });
  const mainTabs = tagsCount.slice(0, FAVORITE_MAIN_TABS);
  const moreTabs = tagsCount.slice(FAVORITE_MAIN_TABS);
  const count = `${total} ${plural(total, [ 'отложенный пост', 'отложенных поста', 'отложенных постов' ])}`;

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

      <div className="ui-filter-bar">
        <nav className="ui-tabs" aria-label="Рубрика">
          <Link href={favoritesUrl({ sort: filter.sort })} data-active={!tag}>
            Все <span className="ui-tabs__count">{ total }</span>
          </Link>
          { mainTabs.map(t => (
            <Link key={t.id} href={favoritesUrl({ tag: t.slug, sort: filter.sort })} data-active={t.id === tag?.id}>
              { t.name } <span className="ui-tabs__count">{ t.n }</span>
            </Link>
          )) }
          { moreTabs.length > 0 && <PostMoreTab
            items={moreTabs.map(t => ({ key: t.slug, label: t.name, href: favoritesUrl({ tag: t.slug, sort: filter.sort }), count: t.n }))}
            active={tag?.slug}
          /> }
        </nav>
        <PostFavoriteSortMenu filter={filter} />
      </div>

      <PostFavoriteGrid list={resource(postFavoriteListResource, list)} />
    </>
  );
}
