import { TagResource } from "@/domains/tags/dto/tagResources";
import Link from "@/components/general/Link";
import { tagTone } from "@/domains/tags/shared/tagTone";

type TagChipsProps = {
  tags: Pick<TagResource, 'id' | 'name' | 'slug'>[],
  linked?: boolean,
  // Размер чипов фильтра ленты — на странице поста; без него мелкие, для мета-строки
  large?: boolean
}

// Рубрики поста. linked — ссылки на фильтр ленты; без него подписи: в кабинете и модерации
// пост может быть не опубликован, и ссылка увела бы в ленту, где его нет.
// Без 'use client' намеренно: компонент рендерят и серверные страницы, и PostCard.
// Цвет чипа — цвет рубрики (tagTone), как в фильтре ленты и справочнике.
export default function TagChips({ tags, linked = false, large = false }: TagChipsProps) {
  if(tags.length === 0){
    return null;
  }

  return (
    <span className={large ? 'ui-tags ui-tags--large' : 'ui-tags'}>
      { tags.map(tag => linked
        ? <Link key={tag.id} href={`/posts?tag=${tag.slug}`} className="ui-tag" data-tone={tagTone(tag.id)}>{ tag.name }</Link>
        : <span key={tag.id} className="ui-tag" data-tone={tagTone(tag.id)}>{ tag.name }</span>) }
    </span>
  );
}
