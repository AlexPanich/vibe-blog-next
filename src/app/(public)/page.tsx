import ButtonLink from "@/components/general/ButtonLink";
import { db } from "@/globals/db";
import { posts, users } from "@/database/schema";
import { resource } from "@/core/resource";
import HomeScoreSheet from "@/domains/posts/components/HomeScoreSheet";
import PostCardBridge from "@/domains/posts/components/PostCardBridge";
import PostAuthorGate from "@/domains/posts/components/PostAuthorGate";
import { postResource } from "@/domains/posts/dto/postResources";
import { tagsWithCounts } from "@/domains/posts/shared/feedOptions";
import { latestMoves, topRatedPosts } from "@/domains/posts/shared/homeBoard";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { IconArrowRight, IconArticle, IconPencilPlus } from "@tabler/icons-react";
import { and, count, desc, eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = 'force-dynamic';

const MOVES = 7;
const TOP = 3;
const AUTHORS = 8;
const TAGS = 12;

export default async function Home() {
  const [ { moves, nextMove }, top, authors, tags ] = await Promise.all([
    latestMoves(MOVES),
    topRatedPosts(TOP),
    db.select({ id: users.id, name: users.name, avatarKey: users.avatarKey, postsCount: count(posts.id) })
      .from(users)
      .innerJoin(posts, and(eq(posts.userId, users.id), eq(posts.status, 'published')))
      .groupBy(users.id)
      .orderBy(desc(count(posts.id)))
      .limit(AUTHORS),
    tagsWithCounts()
  ]);
  const popularTags = tags.filter(t => t.postsCount > 0).sort((a, b) => b.postsCount - a.postsCount).slice(0, TAGS);

  return (
    <>
      <section className="ui-home-hero">
        <div className="ui-home-hero__intro">
          <p className="ui-kicker">Блог авторов</p>
          <h1 className="ui-home-hero__headline">
            Каждый пост — это <span className="ui-mark">ход</span>
          </h1>
          <p className="ui-home-hero__deck">
            Авторы пишут в кабинете — после модерации пост выходит в ленту. Читатели
            оценивают и отвечают в комментариях. Рядом — партия как она идёт.
          </p>
          <div className="ui-hero__cta">
            <ButtonLink href="/posts" size="md" leftSection={<IconArticle size={18} />}>
              Читать блог
            </ButtonLink>
            <PostAuthorGate author={
              <ButtonLink href="/office/posts/create" size="md" variant="default" leftSection={<IconPencilPlus size={18} />}>
                Написать пост
              </ButtonLink>
            } />
          </div>
        </div>

        <HomeScoreSheet moves={[ ...moves ].reverse()} nextMove={nextMove} />
      </section>

      { top.length > 0 && <section className="ui-home-section">
        <div className="ui-home-section__head">
          <h2 className="ui-home-section__title">Лучшее по оценкам читателей</h2>
          <Link href="/posts?sort=rating" className="ui-home-section__more">Вся лента по рейтингу <IconArrowRight size={14} /></Link>
        </div>
        <div className="ui-grid">
          { top.map(post => <PostCardBridge key={post.id} post={resource(postResource, post)} />) }
        </div>
      </section> }

      { authors.length > 0 && <section className="ui-home-section">
        <div className="ui-home-section__head">
          <h2 className="ui-home-section__title">Авторы</h2>
          <Link href="/authors" className="ui-home-section__more">Все авторы <IconArrowRight size={14} /></Link>
        </div>
        <ul className="ui-players">
          { authors.map(author => (
            <li key={author.id}>
              <Link href={`/authors/${author.id}`} className="ui-player">
                <UserAvatar name={author.name} avatarKey={author.avatarKey} size={40} />
                <span className="ui-player__name">{ author.name }</span>
                <span className="ui-player__count">Постов: { author.postsCount }</span>
              </Link>
            </li>
          )) }
        </ul>
      </section> }

      { popularTags.length > 0 && <section className="ui-home-section">
        <div className="ui-home-section__head">
          <h2 className="ui-home-section__title">Рубрики</h2>
        </div>
        <div className="ui-home-tags">
          { popularTags.map(tag => (
            <Link key={tag.id} href={`/posts?tag=${tag.slug}`} className="ui-home-tag">
              { tag.name }<span className="ui-home-tag__count">{ tag.postsCount }</span>
            </Link>
          )) }
        </div>
      </section> }
    </>
  );
}
