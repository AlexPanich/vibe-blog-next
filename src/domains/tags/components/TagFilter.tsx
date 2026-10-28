import type { Tag } from "@/database/types";
import type { Route } from "next";
import Link from "@/components/general/Link";

type TagFilterProps = {
  tags: (Pick<Tag, 'id' | 'name' | 'slug'> & { postsCount: number })[],
  selected: string[],
  // Ссылку собирает лента: она знает остальные свои условия и сохраняет их
  hrefFor: (slugs: string[]) => Route
}

// Фильтр ленты: «Все» и рубрики со счётчиком. Пустые рубрики не показываем, кроме выбранных —
// иначе после снятия последнего поста фильтр нечем было бы выключить.
export default function TagFilter({ tags, selected, hrefFor }: TagFilterProps) {
  const visible = tags.filter(tag => tag.postsCount > 0 || selected.includes(tag.slug));

  if(visible.length === 0){
    return null;
  }

  return (
    <nav className="ui-filter">
      <Link href={hrefFor([])} data-active={selected.length === 0}>Все</Link>
      { visible.map(tag => {
        const active = selected.includes(tag.slug);
        const next = active ? selected.filter(s => s !== tag.slug) : [ ...selected, tag.slug ];

        return (
          <Link key={tag.id} href={hrefFor(next)} data-active={active} aria-pressed={active}>
            { tag.name } <span className="ui-filter__count">{ tag.postsCount }</span>
          </Link>
        );
      }) }
    </nav>
  );
}

