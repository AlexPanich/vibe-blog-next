'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { followTagAction } from "@/domains/tags/actions/tagFollowActions";
import type { TagResource } from "@/domains/tags/dto/tagResources";
import { Button, Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useState } from "react";

// Строка вкладки «Рубрики»: отписка на месте, вернуть — той же кнопкой.
export default function TagFollowRow<T extends TagResource>({ tag }: { tag: StrictResource<T, TagResource> }) {
  const [ following, setFollowing ] = useState(true);
  const toggle = useAction(followTagAction.bind(null, tag.id), { onSuccess: ({ data }) => setFollowing(data.following) });

  return (
    <div className="ui-row ui-row--static">
      <div className="ui-row__body">
        <Link href={`/posts?tag=${encodeURIComponent(tag.slug)}`} className="ui-row__title">{ tag.name }</Link>
        { toggle.result.serverError && <Text size="sm" c="red">{ toggle.result.serverError.message }</Text> }
      </div>
      <div className="ui-row__aside ui-row__aside--inline">
        <Button
          size="compact-sm"
          variant={following ? 'default' : 'light'}
          loading={toggle.isPending}
          onClick={() => toggle.execute({ follow: !following })}
        >
          { following ? 'Отписаться' : 'Подписаться снова' }
        </Button>
      </div>
    </div>
  );
}
