'use client'

import 'client-only';
import { showToast } from "@/components/general/showToast";
import { followTagAction } from "@/domains/tags/actions/tagFollowActions";
import type { TagRowResource } from "@/domains/tags/dto/tagResources";
import { IconAlertCircle, IconCheck, IconPlus } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type TagFollowToggleProps = {
  tag: TagRowResource,
  following: boolean,
  onChange: (tagId: number, follow: boolean) => void,
  // pill — пилюля с подписью (на телефоне подпись прячется и кнопка круглая), round — всегда круглая
  variant: 'pill' | 'round'
}

// Подписка на рубрику на /tags. Ошибка (лимит подписок) — тостом
export default function TagFollowToggle({ tag, following, onChange, variant }: TagFollowToggleProps) {
  const toggle = useAction(followTagAction.bind(null, tag.id), {
    onSuccess: ({ data }) => onChange(tag.id, data.following),
    onError: ({ error }) => showToast({
      id: `tag-follow-${tag.id}`,
      icon: <IconAlertCircle size={20} />,
      title: 'Не получилось',
      text: error.serverError?.message ?? 'Попробуйте ещё раз',
      href: null
    })
  });
  const Icon = following ? IconCheck : IconPlus;

  return (
    <button
      type="button"
      className="ui-tag-follow-toggle"
      data-variant={variant}
      data-following={following || undefined}
      aria-pressed={following}
      aria-label={following ? `Отписаться от рубрики «${tag.name}»` : `Подписаться на рубрику «${tag.name}»`}
      disabled={toggle.isPending}
      onClick={() => toggle.execute({ follow: !following })}
    >
      <Icon size={variant === 'pill' ? 15 : 18} stroke={2} aria-hidden />
      { variant === 'pill' && <span className="ui-tag-follow-toggle__label">{ following ? 'Вы подписаны' : 'Подписаться' }</span> }
    </button>
  );
}
