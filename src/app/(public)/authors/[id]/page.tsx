import { db } from "@/globals/db";
import { POST_TYPES, PostType, postRatings, posts } from "@/database/schema";
import { and, avg, count, desc, eq, type SQL } from "drizzle-orm";
import { resource } from "@/core/resource";
import { postResource } from "@/domains/posts/dto/postResources";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withCardData } from "@/domains/posts/shared/postCards";
import { withCovers } from "@/domains/posts/shared/postImages";
import { countFavorites, loadFavorites } from "@/domains/posts/shared/loadFavorites";
import { formatRating } from "@/domains/posts/shared/formatRating";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import PostCardBridge from "@/domains/posts/components/PostCardBridge";
import AuthorPostTabs from "@/domains/posts/components/AuthorPostTabs";
import AuthorHead from "@/domains/users/components/AuthorHead";
import { getAuthor } from "@/domains/users/shared/getAuthor";
import { authorCover } from "@/domains/users/shared/authorCover";
import { followersCount } from "@/domains/users/shared/userFollows";
import UserBlockProvider from "@/domains/users/components/block/UserBlockProvider";
import UserBlockGate from "@/domains/users/components/block/UserBlockGate";
import ButtonLink from "@/components/general/ButtonLink";
import { idOrFail } from "@/shared/params";
import { siteConfig } from "@/config/site";
import { IconArticle, IconRss } from "@tabler/icons-react";
import type { Metadata } from "next";

const LATEST = 12;

export async function generateMetadata({ params }: PageProps<'/authors/[id]'>): Promise<Metadata> {
  const author = await getAuthor(idOrFail((await params).id));

  return {
    title: author.name,
    description: author.bio ?? undefined,
    // Абсолютный URL: metadataBase нет (план 32, реш. 3)
    alternates: {
      types: {
        'application/rss+xml': [ { url: `${siteConfig.url}/authors/${author.id}/rss.xml`, title: `Vibe — ${author.name}` } ]
      }
    }
  };
}

export default async function AuthorPage({ params, searchParams }: PageProps<'/authors/[id]'>) {
  const author = await getAuthor(idOrFail((await params).id));
  const query = await searchParams;
  const published = and(eq(posts.userId, author.id), eq(posts.status, 'published'));

  const [ byType, [ rating ], [ last ], followers, favoritesCount ] = await Promise.all([
    db.select({ type: posts.type, count: count() }).from(posts).where(published).groupBy(posts.type),
    // Взвешенная средняя по опубликованным постам — как на странице авторов
    db.select({ average: avg(postRatings.value) }).from(postRatings).innerJoin(posts, eq(posts.id, postRatings.postId)).where(published),
    // Баннер — своя обложка или обложка последнего поста, какая бы вкладка ни была открыта
    author.coverKey ? [] : db.select({ id: posts.id, coverImageId: posts.coverImageId }).from(posts).where(published).orderBy(desc(posts.publishedAt)).limit(1),
    followersCount(author.id),
    // Закрытое избранное — null: вкладки нет (спека 40)
    author.favoritesPublic ? countFavorites(author.id) : null
  ]);
  // ?tab=favorites при закрытом или пустом избранном — обычные посты (план 40, реш. 1, 4)
  const showFavorites = query.tab === 'favorites' && (favoritesCount ?? 0) > 0;
  const type = showFavorites ? undefined : postTypeParam(query.type);
  const counts = Object.fromEntries(POST_TYPES.map(t => [ t, byType.find(row => row.type === t)?.count ?? 0 ])) as Record<PostType, number>;
  const postsCount = byType.reduce((sum, row) => sum + row.count, 0);
  const shownCount = type ? counts[type] : postsCount;
  const [ cards, [ banner ] ] = await Promise.all([
    showFavorites ? favoriteCards(author.id) : latestCards(type ? and(published, eq(posts.type, type)) : published),
    last ? withCovers([ last ]) : [ undefined ]
  ]);

  return (
    <UserBlockProvider authorId={author.id} authorName={author.name}>
      <AuthorHead
        author={author}
        cover={authorCover(author.coverKey, banner?.cover)}
        postsCount={postsCount}
        followersCount={followers}
        rating={rating.average === null ? null : formatRating(Number(rating.average))}
      />

      <UserBlockGate>
        <AuthorPostTabs authorId={author.id} counts={counts} active={showFavorites ? 'favorites' : type} favorites={favoritesCount} />
        { cards.length === 0 ? (
          <div className="ui-empty">
            <IconArticle size={26} stroke={1.6} />
            <p>Постов пока нет.</p>
          </div>
        ) : (
          <div className="ui-post-grid ui-author-posts">
            { cards.map(post => <PostCardBridge key={post.id} post={resource(postResource, post)} />) }
          </div>
        ) }
        <div className="ui-author-more">
          { showFavorites
            ? favoritesCount! > LATEST && <ButtonLink href={`/authors/${author.id}/favorites`} variant="default">Всё избранное</ButtonLink>
            : shownCount > LATEST && <ButtonLink href={feedUrl({ author: author.id, type })} variant="default">Все посты в ленте</ButtonLink> }
          {/* <a>, не Link: route handler, мягкая навигация не нужна */}
          <a className="ui-rss-link" href={`/authors/${author.id}/rss.xml`}><IconRss size={16} stroke={1.8} /> RSS автора</a>
        </div>
      </UserBlockGate>
    </UserBlockProvider>
  );
}

// Последние опубликованные посты автора — все или одного типа
async function latestCards(where: SQL | undefined){
  const latest = await db.query.posts.findMany({ where, orderBy: desc(posts.publishedAt), limit: LATEST, with: { author: true, ...POST_TAGS_WITH } });

  return withCardData(latest.map(post => ({ ...post, tags: pickTags(post) })));
}

// Вкладка избранного: новые закладки сверху, карточки уже с данными и рубриками
async function favoriteCards(authorId: number){
  const list = await loadFavorites(authorId, LATEST);

  return list.map(item => item.post);
}

// ?type= — один из типов поста; что-то другое — «все посты»
function postTypeParam(value: string | string[] | undefined): PostType | undefined {
  return POST_TYPES.find(t => t === value);
}
