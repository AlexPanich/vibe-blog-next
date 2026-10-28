import { db } from "@/globals/db";
import { postRatings, posts } from "@/database/schema";
import { and, avg, count, desc, eq } from "drizzle-orm";
import Link from "@/components/general/Link";
import { resource } from "@/core/resource";
import { postResource } from "@/domains/posts/dto/postResources";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withCovers } from "@/domains/posts/shared/postImages";
import { withRatings } from "@/domains/posts/shared/postRatings";
import PostCardBridge from "@/domains/posts/components/PostCardBridge";
import UserAvatar from "@/domains/users/components/UserAvatar";
import { getAuthor } from "@/domains/users/shared/getAuthor";
import { followersCount } from "@/domains/users/shared/userFollows";
import UserBlockProvider from "@/domains/users/components/block/UserBlockProvider";
import UserBlockGate from "@/domains/users/components/block/UserBlockGate";
import UserBlockButton from "@/domains/users/components/block/UserBlockButton";
import UserFollowButton from "@/domains/users/exports/UserFollowButton";
import MessageAuthorActions from "@/domains/messages/exports/MessageAuthorActions";
import LocalDate from "@/components/general/LocalDate";
import ButtonLink from "@/components/general/ButtonLink";
import { idOrFail } from "@/shared/params";
import { IconArrowLeft, IconArticle, IconCalendar, IconChessKnight, IconStarFilled } from "@tabler/icons-react";

const LATEST = 12;

export async function generateMetadata({ params }: PageProps<'/authors/[id]'>) {
  const author = await getAuthor(idOrFail((await params).id));
  return { title: author.name, description: author.bio ?? undefined };
}

export default async function AuthorPage({ params }: PageProps<'/authors/[id]'>) {
  const author = await getAuthor(idOrFail((await params).id));
  const published = and(eq(posts.userId, author.id), eq(posts.status, 'published'));

  const [ [ stats ], [ rating ], latest, followers ] = await Promise.all([
    db.select({ postsCount: count() }).from(posts).where(published),
    // Взвешенная средняя по опубликованным постам — как на странице авторов
    db.select({ average: avg(postRatings.value) }).from(postRatings).innerJoin(posts, eq(posts.id, postRatings.postId)).where(published),
    db.query.posts.findMany({ where: published, orderBy: desc(posts.publishedAt), limit: LATEST, with: { author: true, ...POST_TAGS_WITH } }),
    followersCount(author.id)
  ]);
  const cards = await withCovers(await withRatings(latest.map(post => ({ ...post, tags: pickTags(post) }))));

  return (
    <UserBlockProvider authorId={author.id} authorName={author.name}>
      <Link href="/authors" className="ui-backlink">
        <IconArrowLeft size={15} />Все авторы
      </Link>

      <section className="ui-profile">
        <UserAvatar name={author.name} avatarKey={author.avatarKey} size={96} />
        <div className="ui-profile__body">
          <h1 className="ui-title">{ author.name }</h1>
          <UserBlockGate>
            { author.bio && <p className="ui-profile__bio">{ author.bio }</p> }
            <div className="ui-meta">
              <span className="ui-meta__item"><IconArticle size={14} stroke={1.8} />Постов: { stats.postsCount }</span>
              { rating.average !== null && <span className="ui-meta__item">
                <IconStarFilled size={14} className="ui-star" />
                { Number(rating.average).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }
              </span> }
              <span className="ui-meta__item">
                <IconCalendar size={14} stroke={1.8} />С нами с <LocalDate value={author.createdAt} options={{ dateStyle: 'long' }} />
              </span>
            </div>
            <UserFollowButton authorId={author.id} followersCount={followers} />
            <MessageAuthorActions authorId={author.id} />
          </UserBlockGate>
          <UserBlockButton />
        </div>
      </section>

      <UserBlockGate>
        { cards.length === 0 ? (
          <div className="ui-empty">
            <IconChessKnight size={26} stroke={1.6} />
            <p>Постов пока нет.</p>
          </div>
        ) : <>
          <div className="ui-section-head">
            <h2 className="ui-panel__title">Последние посты</h2>
            { stats.postsCount > LATEST && <ButtonLink href={`/posts?author=${author.id}`} variant="default">Все посты в ленте</ButtonLink> }
          </div>
          <div className="ui-grid">
            { cards.map(post => <PostCardBridge key={post.id} post={resource(postResource, post)} />) }
          </div>
        </> }
      </UserBlockGate>
    </UserBlockProvider>
  );
}

