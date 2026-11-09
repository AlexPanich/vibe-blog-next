import Link from "@/components/general/Link";
import { plural } from "@/core/plural";
import HomeWriteBand from "@/domains/posts/components/HomeWriteBand";
import { tagsWithCounts } from "@/domains/posts/shared/feedOptions";
import { formatRating } from "@/domains/posts/shared/formatRating";
import { lastPostCovers } from "@/domains/posts/shared/lastPostCovers";
import { tagTone } from "@/domains/tags/exports/tagTone";
import AuthorListRow from "@/domains/users/components/AuthorListRow";
import AuthorsSearch from "@/domains/users/components/AuthorsSearch";
import AuthorSpotlight from "@/domains/users/components/AuthorSpotlight";
import { AuthorsSort, authorsFilterDto } from "@/domains/users/dto/userRequests";
import { authorsDirectory, DirectoryAuthor } from "@/domains/users/shared/authorsDirectory";
import { authorsUrl } from "@/domains/users/shared/authorsUrl";
import { authorCover } from "@/domains/users/shared/authorCover";
import { IconUsers } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Авторы' };

const SPOTLIGHT = 3;
const CHIPS = 5;
const SORTS: { value: AuthorsSort, label: string }[] = [
  { value: 'popular', label: 'Популярные' },
  { value: 'posts', label: 'Больше постов' },
  { value: 'rating', label: 'Лучшие оценки' },
  { value: 'name', label: 'По имени' }
];

/*
  Авторы (спека 30): заголовок с сортировками, поиск и «Пишут о» по рубрикам, три карточки
  самых читаемых, ниже — список остальных и баннер «Есть что рассказать?». С поиском или
  рубрикой карточек нет — все найденные идут списком
*/
export default async function Authors({ searchParams }: PageProps<'/authors'>) {
  const filter = authorsFilterDto.parse(await searchParams);
  const filtered = Boolean(filter.q || filter.tag);
  const [ authors, tags ] = await Promise.all([ authorsDirectory(filter), tagsWithCounts() ]);
  const spotlight = filtered ? [] : [ ...authors ].sort(byReaders).slice(0, SPOTLIGHT);
  const rest = authors.filter(author => !spotlight.includes(author));
  // Обложка последнего поста — только тем, у кого нет своей (спека 41)
  const covers = await lastPostCovers(spotlight.filter(author => !author.coverKey).map(author => author.id));
  const chips = tags.filter(t => t.postsCount > 0).sort((a, b) => b.postsCount - a.postsCount).slice(0, CHIPS);
  const active = filter.tag ? tags.find(t => t.slug === filter.tag) : undefined;

  if(active && !chips.includes(active)){
    chips.push(active);
  }

  return (
    <>
      <header className="ui-authors-head">
        <div className="ui-authors-head__title">
          <h1 className="ui-title ui-title--lg">Авторы</h1>
          <p className="ui-authors-head__sub">
            { filtered
              ? `${plural(authors.length, [ 'Нашёлся', 'Нашлось', 'Нашлось' ])} ${authors.length} ${plural(authors.length, [ 'автор', 'автора', 'авторов' ])}`
              : `${authors.length} ${plural(authors.length, [ 'автор пишет', 'автора пишут', 'авторов пишут' ])} в Vibe` }
          </p>
        </div>
        <nav className="ui-authors-sorts" aria-label="Сортировка">
          { SORTS.map(sort => (
            <Link key={sort.value} href={authorsUrl({ ...filter, sort: sort.value })} data-active={filter.sort === sort.value || undefined}>
              { sort.label }
            </Link>
          )) }
        </nav>
        <div className="ui-authors-head__filters">
          <AuthorsSearch filter={filter} />
          { chips.length > 0 && <nav className="ui-authors-topics" aria-label="Пишут о">
            <span className="ui-authors-topics__label">Пишут о</span>
            <Link href={authorsUrl({ ...filter, tag: undefined })} className="ui-author-topic ui-author-topic--chip" data-tone={filter.tag ? 'plain' : 'ink'}>Все</Link>
            { chips.map(tag => (
              <Link
                key={tag.id}
                href={authorsUrl({ ...filter, tag: tag.slug })}
                className="ui-author-topic ui-author-topic--chip"
                data-tone={tagTone(tag.id)}
                data-active={tag.slug === filter.tag || undefined}
              >
                { tag.name }
              </Link>
            )) }
          </nav> }
        </div>
      </header>

      { authors.length === 0 && <div className="ui-empty">
        <IconUsers size={26} stroke={1.6} />
        { filtered
          ? <p>Никого не нашли. <Link href={authorsUrl({ sort: filter.sort })}>Показать всех</Link></p>
          : <p>Пока никто ничего не опубликовал.</p> }
      </div> }

      { spotlight.length > 0 && <section className="ui-authors-spotlight">
        <div className="ui-authors-section-head">
          <h2 className="ui-authors-section-head__title">Больше всего читателей</h2>
          <span className="ui-authors-section-head__note">по числу подписчиков</span>
        </div>
        <div className="ui-authors-spotlight__row">
          { spotlight.map(author => (
            <AuthorSpotlight key={author.id} author={author} cover={authorCover(author.coverKey, covers.get(author.id))} rating={rating(author)} />
          )) }
        </div>
      </section> }

      { rest.length > 0 && <section className="ui-authors-list">
        <h2 className="ui-authors-section-head__title">{ filtered ? 'Найденные авторы' : 'Все авторы' }</h2>
        <div className="ui-authors-list__head" aria-hidden>
          <span>Автор</span>
          <span>Пишут о</span>
          <span>Постов</span>
          <span>Оценка</span>
          <span>Читателей</span>
          <span />
        </div>
        <ul className="ui-authors-list__rows">
          { rest.map(author => <AuthorListRow key={author.id} author={author} rating={rating(author)} />) }
        </ul>
      </section> }

      <HomeWriteBand />
    </>
  );
}

// Карточки — по подписчикам, при равенстве — по постам, какая бы сортировка ни была выбрана
function byReaders(a: DirectoryAuthor, b: DirectoryAuthor){
  return b.followersCount - a.followersCount || b.postsCount - a.postsCount || a.name.localeCompare(b.name, 'ru');
}

function rating(author: DirectoryAuthor){
  return author.ratingAverage === null ? null : formatRating(author.ratingAverage);
}
