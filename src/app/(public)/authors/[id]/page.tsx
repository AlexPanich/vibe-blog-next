import { db } from "@/globals/db";
import { POST_TYPES, PostType, postRatings, posts } from "@/database/schema";
import { and, avg, count, desc, eq } from "drizzle-orm";
import { resource } from "@/core/resource";
import { postResource } from "@/domains/posts/dto/postResources";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withCardData } from "@/domains/posts/shared/postCards";
import { withCovers } from "@/domains/posts/shared/postImages";
import { formatRating } from "@/domains/posts/shared/formatRating";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import PostCardBridge from "@/domains/posts/components/PostCardBridge";
import AuthorPostTabs from "@/domains/posts/components/AuthorPostTabs";
import AuthorHead from "@/domains/users/components/AuthorHead";
import { getAuthor } from "@/domains/users/shared/getAuthor";
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
  const type = postTypeParam((await searchParams).type);
  const published = and(eq(posts.userId, author.id), eq(posts.status, 'published'));
  const shown = type ? and(published, eq(posts.type, type)) : published;

  const [ byType, [ rating ], latest, [ last ], followers ] = await Promise.all([
    db.select({ type: posts.type, count: count() }).from(posts).where(published).groupBy(posts.type),
    // Взвешенная средняя по опубликованным постам — как на странице авторов
    db.select({ average: avg(postRatings.value) }).from(postRatings).innerJoin(posts, eq(posts.id, postRatings.postId)).where(published),
    db.query.posts.findMany({ where: shown, orderBy: desc(posts.publishedAt), limit: LATEST, with: { author: true, ...POST_TAGS_WITH } }),
    // Баннер — обложка последнего опубликованного поста, какая бы вкладка ни была открыта
    db.select({ id: posts.id, coverImageId: posts.coverImageId }).from(posts).where(published).orderBy(desc(posts.publishedAt)).limit(1),
    followersCount(author.id)
  ]);
  const counts = Object.fromEntries(POST_TYPES.map(t => [ t, byType.find(row => row.type === t)?.count ?? 0 ])) as Record<PostType, number>;
  const postsCount = byType.reduce((sum, row) => sum + row.count, 0);
  const shownCount = type ? counts[type] : postsCount;
  const [ cards, [ banner ] ] = await Promise.all([
    withCardData(latest.map(post => ({ ...post, tags: pickTags(post) }))),
    last ? withCovers([ last ]) : [ undefined ]
  ]);

  return (
    <UserBlockProvider authorId={author.id} authorName={author.name}>
      <AuthorHead
        author={author}
        cover={banner?.cover ?? null}
        postsCount={postsCount}
        followersCount={followers}
        rating={rating.average === null ? null : formatRating(Number(rating.average))}
      />

      <UserBlockGate>
        <AuthorPostTabs authorId={author.id} counts={counts} active={type} />
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
          { shownCount > LATEST && <ButtonLink href={feedUrl({ author: author.id, type })} variant="default">Все посты в ленте</ButtonLink> }
          {/* <a>, не Link: route handler, мягкая навигация не нужна */}
          <a className="ui-rss-link" href={`/authors/${author.id}/rss.xml`}><IconRss size={16} stroke={1.8} /> RSS автора</a>
        </div>
      </UserBlockGate>
    </UserBlockProvider>
  );
}

// ?type= — один из типов поста; что-то другое — «все посты»
function postTypeParam(value: string | string[] | undefined): PostType | undefined {
  return POST_TYPES.find(t => t === value);
}
