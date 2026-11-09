import { plural } from "@/core/plural";
import { resource } from "@/core/resource";
import { tagsWithCounts } from "@/domains/posts/shared/feedOptions";
import TagsBoard from "@/domains/tags/components/directory/TagsBoard";
import { tagDirectoryResource } from "@/domains/tags/dto/tagResources";
import { IconTags } from "@tabler/icons-react";
import type { Metadata } from "next";

// Счётчики постов меняются с каждой публикацией
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Рубрики',
  description: 'Все рубрики Vibe: о чём пишут авторы и сколько уже опубликовано. Подпишитесь на любимые.'
};

const TOP = 6;

/*
  Рубрики (спека 31): шесть самых наполненных крупными плитками, остальные — строками по
  алфавиту. Рубрики без опубликованных постов не показываются
*/
export default async function Tags() {
  // tagsWithCounts уже по алфавиту, sort устойчивый — при равенстве порядок алфавитный
  const tags = (await tagsWithCounts()).filter(tag => tag.postsCount > 0);
  const top = [ ...tags ].sort((a, b) => b.postsCount - a.postsCount).slice(0, TOP);
  const rest = tags.filter(tag => !top.includes(tag));

  return (
    <>
      <header className="ui-tags-head">
        <h1 className="ui-title ui-title--lg">Рубрики</h1>
        <p className="ui-tags-head__sub">
          { tags.length } { plural(tags.length, [ 'рубрика', 'рубрики', 'рубрик' ]) } — выберите, о чём читать
          <span className="ui-tags-head__more">, и подпишитесь на любимые</span>
        </p>
      </header>

      { tags.length === 0
        ? <div className="ui-empty">
          <IconTags size={26} stroke={1.6} />
          <p>Пока ни в одной рубрике нет опубликованных постов.</p>
        </div>
        : <TagsBoard directory={resource(tagDirectoryResource, { top, rest })} /> }
    </>
  );
}
