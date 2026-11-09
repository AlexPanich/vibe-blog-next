import { plural } from "@/core/plural";
import { resource } from "@/core/resource";
import Link from "@/components/general/Link";
import HomeWriteBand from "@/domains/posts/components/HomeWriteBand";
import HomeWriteLink from "@/domains/posts/components/HomeWriteLink";
import PostCardBridge from "@/domains/posts/components/PostCardBridge";
import PostFeatured from "@/domains/posts/components/PostFeatured";
import { postResource } from "@/domains/posts/dto/postResources";
import { tagsWithCounts } from "@/domains/posts/shared/feedOptions";
import { homeFresh, weekPostsCount } from "@/domains/posts/shared/homeBoard";
import AuthorTile from "@/domains/users/components/AuthorTile";
import { popularAuthors } from "@/domains/users/shared/popularAuthors";
import { IconArrowRight } from "@tabler/icons-react";
import Image from "next/image";

export const dynamic = 'force-dynamic';

const CARDS = 3;
const AUTHORS = 4;
const CHIPS = 5;
// Цвета чипов рубрик по порядку, как в макете
const CHIP_TONES = [ 'coral', 'plum', 'mint', 'sun', 'plain' ] as const;

/*
  Главная (спека 30): жёлтая сцена с иллюстрацией, «Свежее» (выбор редакции и карточки),
  авторы, на которых подписываются, и коралловый баннер «Есть что рассказать?»
*/
export default async function Home() {
  const [ week, fresh, authors, tags ] = await Promise.all([
    weekPostsCount(),
    homeFresh(CARDS),
    popularAuthors(AUTHORS),
    tagsWithCounts()
  ]);
  const chips = tags.filter(t => t.postsCount > 0).sort((a, b) => b.postsCount - a.postsCount).slice(0, CHIPS);

  return (
    <>
      <section className="ui-home-stage">
        <Image className="ui-home-stage__art" src="/home-hero.webp" width={1584} height={672} sizes="(max-width: 720px) 100vw, 760px" alt="" priority />
        <div className="ui-home-stage__copy">
          { week > 0 && <p className="ui-home-stage__kicker">
            <span className="ui-home-stage__dot" aria-hidden />
            { week } { plural(week, [ 'новая история', 'новые истории', 'новых историй' ]) } за неделю
          </p> }
          <h1 className="ui-home-stage__headline">Истории, которые хочется дочитать</h1>
          <p className="ui-home-stage__deck">
            Путешествия, переводы и личный опыт от живых авторов. Читайте, спорьте в комментариях,
            подписывайтесь на тех, кто цепляет.
          </p>
          <div className="ui-home-stage__cta">
            <Link href="/posts" className="ui-home-btn ui-home-btn--ink">Читать ленту<IconArrowRight size={18} /></Link>
            <HomeWriteLink
              className="ui-home-btn ui-home-btn--light ui-home-stage__write"
              labels={{ author: 'Написать пост', member: 'Стать автором', guest: 'Стать автором' }}
            />
          </div>
        </div>
      </section>

      { fresh.featured && <section className="ui-home-section">
        <div className="ui-home-section__head">
          <h2 className="ui-home-section__title">Свежее</h2>
          { chips.length > 0 && <nav className="ui-home-chips" aria-label="Рубрики">
            <Link href="/posts" className="ui-home-chip" data-tone="ink">Все</Link>
            { chips.map((tag, i) => (
              <Link key={tag.id} href={`/posts?tag=${tag.slug}`} className="ui-home-chip" data-tone={CHIP_TONES[i % CHIP_TONES.length]}>
                { tag.name }
              </Link>
            )) }
            <Link href="/tags" className="ui-home-section__more ui-home-chips__all">Все рубрики<IconArrowRight size={18} /></Link>
          </nav> }
          <Link href="/posts" className="ui-home-section__more">Вся лента<IconArrowRight size={18} /></Link>
        </div>

        <PostFeatured post={resource(postResource, fresh.featured)} pick={fresh.pick} />

        { fresh.cards.length > 0 && <div className="ui-post-grid ui-home-cards">
          { fresh.cards.map(post => <PostCardBridge key={post.id} post={resource(postResource, post)} />) }
        </div> }
      </section> }

      { authors.length > 0 && <section className="ui-home-authors">
        <div className="ui-home-section__head">
          <h2 className="ui-home-section__title ui-home-section__title--sm">
            {/* На телефоне заголовок короче, как в макете */}
            <span className="ui-home-authors__title-wide">Авторы, на которых подписываются</span>
            <span className="ui-home-authors__title-short">Популярные авторы</span>
          </h2>
          <p className="ui-home-section__sub">Подпишитесь — новые посты будут приходить в уведомления.</p>
          <Link href="/authors" className="ui-home-section__more">Все авторы<IconArrowRight size={18} /></Link>
        </div>
        <div className="ui-home-authors__row">
          { authors.map(author => <AuthorTile key={author.id} author={author} />) }
        </div>
      </section> }

      <HomeWriteBand />
    </>
  );
}
