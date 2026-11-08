'use client'

import 'client-only';
import { plural } from "@/core/plural";
import { followTagAction } from "@/domains/tags/actions/tagFollowActions";
import type { TagRowResource } from "@/domains/tags/dto/tagResources";
import TagFollowChip from "@/domains/tags/components/follows/TagFollowChip";
import { IconBellMinus, IconBellPlus } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

/*
  Строка вкладки «Рубрики» (спека 42) — внутри TagFollowList: чип рубрики, число опубликованных постов, отписка.
  Отписка на месте, вернуть — той же кнопкой
*/
export default function TagFollowRow({ tag }: { tag: TagRowResource }) {
  const [ following, setFollowing ] = useState(true);
  const toggle = useAction(followTagAction.bind(null, tag.id), { onSuccess: ({ data }) => setFollowing(data.following) });

  return (
    <li className="ui-follow-person ui-follow-person--tag">
      <TagFollowChip tag={tag} />
      <p className="ui-follow-person__stats">
        { tag.postsCount } { plural(tag.postsCount, [ 'пост', 'поста', 'постов' ]) }
      </p>
      <div className="ui-follow-person__action">
        <button
          type="button"
          className="ui-pill ui-pill--outline ui-follow-person__button"
          disabled={toggle.isPending}
          onClick={() => toggle.execute({ follow: !following })}
        >
          { following
            ? <><IconBellMinus size={15} stroke={1.8} /><span className="ui-pill__label">Отписаться</span></>
            : <><IconBellPlus size={15} stroke={1.8} /><span className="ui-pill__label">Подписаться снова</span></> }
        </button>
      </div>
      { toggle.result.serverError && <p className="ui-follow-person__error">{ toggle.result.serverError.message }</p> }
    </li>
  );
}
