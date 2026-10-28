import { TagResource } from "@/domains/tags/dto/tagResources";
import Link from "@/components/general/Link";

type TagChipsProps = {
  tags: Pick<TagResource, 'id' | 'name' | 'slug'>[],
  linked?: boolean
}

// Рубрики поста. linked — ссылки на фильтр ленты; без него подписи: в кабинете и модерации
// пост может быть не опубликован, и ссылка увела бы в ленту, где его нет.
// Без 'use client' намеренно: компонент рендерят и серверные страницы, и PostCard.
export default function TagChips({ tags, linked = false }: TagChipsProps) {
  if(tags.length === 0){
    return null;
  }

  return (
    <span className="ui-tags">
      { tags.map(tag => linked
        ? <Link key={tag.id} href={`/posts?tag=${tag.slug}`} className="ui-tag">{ tag.name }</Link>
        : <span key={tag.id} className="ui-tag">{ tag.name }</span>) }
    </span>
  );
}
