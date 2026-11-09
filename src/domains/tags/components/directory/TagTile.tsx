'use client'

import 'client-only';
import Link from "@/components/general/Link";
import { plural } from "@/core/plural";
import TagFollowToggle from "@/domains/tags/components/directory/TagFollowToggle";
import type { TagRowResource } from "@/domains/tags/dto/tagResources";
import { tagTone } from "@/domains/tags/shared/tagTone";
import { IconArrowUpRight } from "@tabler/icons-react";

type TagTileProps = {
  tag: TagRowResource,
  // null — кнопки нет: гость или подписки ещё не загружены
  following: boolean | null,
  onChange: (tagId: number, follow: boolean) => void
}

/*
  Крупная плитка рубрики. Ссылка растянута на всю плитку через ::after, кнопка подписки лежит
  поверх: button внутри a невалиден
*/
export default function TagTile({ tag, following, onChange }: TagTileProps) {
  return (
    <div className="ui-tag-tile" data-tone={tagTone(tag.id)}>
      <Link href={`/posts?tag=${tag.slug}`} className="ui-tag-tile__name">{ tag.name }</Link>
      { following !== null && <TagFollowToggle tag={tag} following={following} onChange={onChange} variant="pill" /> }
      <p className="ui-tag-tile__count">
        <span className="ui-tag-tile__num">{ tag.postsCount }</span>
        { plural(tag.postsCount, [ 'пост', 'поста', 'постов' ]) }
      </p>
      <span className="ui-tag-tile__go" aria-hidden><IconArrowUpRight size={22} /></span>
    </div>
  );
}
