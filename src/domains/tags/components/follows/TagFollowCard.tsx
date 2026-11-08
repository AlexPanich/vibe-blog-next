'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { plural } from "@/core/plural";
import Link from "@/components/general/Link";
import { followTagAction } from "@/domains/tags/actions/tagFollowActions";
import type { TagRowListResource, TagRowResource } from "@/domains/tags/dto/tagResources";
import TagFollowChip from "@/domains/tags/components/follows/TagFollowChip";
import { IconX } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type TagFollowCardProps<T extends TagRowListResource> = {
  tags: StrictResource<T, TagRowListResource>
}

/*
  «Мои рубрики» справа на «Подписках» (спека 42): чип, число постов, крестик — отписка.
  Action перечитывает страницу (revalidatePath), и рубрика уходит из списка и из числа на вкладке
*/
export default function TagFollowCard<T extends TagRowListResource>({ tags }: TagFollowCardProps<T>) {
  return (
    <section className="ui-follow-card">
      <h2 className="ui-follow-card__title">Мои рубрики</h2>
      { tags.length === 0
        ? <p className="ui-follow-card__empty">Выберите рубрику в <Link href="/posts">ленте</Link> — её посты соберутся в «Моей ленте».</p>
        : <ul className="ui-follow-card__list">{ tags.map(tag => <TagFollowCardItem key={tag.id} tag={tag} />) }</ul> }
    </section>
  );
}

function TagFollowCardItem({ tag }: { tag: TagRowResource }){
  const unfollow = useAction(followTagAction.bind(null, tag.id));

  return (
    <li className="ui-follow-card__item">
      <TagFollowChip tag={tag} />
      <span className="ui-follow-card__count">{ tag.postsCount } { plural(tag.postsCount, [ 'пост', 'поста', 'постов' ]) }</span>
      <button
        type="button"
        className="ui-follow-card__remove"
        aria-label={`Отписаться от рубрики «${tag.name}»`}
        title="Отписаться"
        disabled={unfollow.isPending}
        onClick={() => unfollow.execute({ follow: false })}
      >
        <IconX size={15} stroke={1.8} />
      </button>
      { unfollow.result.serverError && <p className="ui-follow-person__error">{ unfollow.result.serverError.message }</p> }
    </li>
  );
}
