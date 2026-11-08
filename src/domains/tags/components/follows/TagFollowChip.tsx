import Link from "@/components/general/Link";
import { tagTone } from "@/domains/tags/shared/tagTone";

// Чип рубрики «#Горы» цвета рубрики (tagTone) — ведёт в ленту с этой рубрикой. Без 'use client'
export default function TagFollowChip({ tag }: { tag: { id: number, name: string, slug: string } }) {
  return (
    <Link href={`/posts?tag=${encodeURIComponent(tag.slug)}`} className="ui-author-topic" data-tone={tagTone(tag.id)}>
      #{ tag.name }
    </Link>
  );
}
