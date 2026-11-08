'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import TagFollowRow from "@/domains/tags/components/follows/TagFollowRow";
import type { TagRowListResource } from "@/domains/tags/dto/tagResources";
import { useState } from "react";

type TagFollowListProps<T extends TagRowListResource> = {
  tags: StrictResource<T, TagRowListResource>
}

/*
  Вкладка «Рубрики». Как UserFollowList — снимок на момент открытия: после отписки action
  перечитывает страницу, а строка остаётся с «Подписаться снова»
*/
export default function TagFollowList<T extends TagRowListResource>({ tags }: TagFollowListProps<T>) {
  const [ snapshot ] = useState(tags);

  return (
    <ul className="ui-follow-list">
      { snapshot.map(tag => <TagFollowRow key={tag.id} tag={tag} />) }
    </ul>
  );
}
