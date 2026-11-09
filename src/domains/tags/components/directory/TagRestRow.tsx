'use client'

import 'client-only';
import Link from "@/components/general/Link";
import { plural } from "@/core/plural";
import TagFollowToggle from "@/domains/tags/components/directory/TagFollowToggle";
import type { TagRowResource } from "@/domains/tags/dto/tagResources";
import { tagTone } from "@/domains/tags/shared/tagTone";

type TagRestRowProps = {
  tag: TagRowResource,
  following: boolean | null,
  onChange: (tagId: number, follow: boolean) => void
}

// Строка «Остальных рубрик»: точка цвета рубрики, название и число постов, круглая кнопка подписки
export default function TagRestRow({ tag, following, onChange }: TagRestRowProps) {
  return (
    <li className="ui-tag-rest" data-tone={tagTone(tag.id)}>
      <span className="ui-tag-rest__dot" aria-hidden />
      <span className="ui-tag-rest__text">
        <Link href={`/posts?tag=${tag.slug}`} className="ui-tag-rest__name">{ tag.name }</Link>
        <span className="ui-tag-rest__count">{ tag.postsCount } { plural(tag.postsCount, [ 'пост', 'поста', 'постов' ]) }</span>
      </span>
      { following !== null && <TagFollowToggle tag={tag} following={following} onChange={onChange} variant="round" /> }
    </li>
  );
}
