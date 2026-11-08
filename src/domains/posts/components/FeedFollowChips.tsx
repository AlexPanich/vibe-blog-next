import type { Tag, User } from "@/database/types";
import { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import FeedFollowChipsShell from "@/domains/posts/components/FeedFollowChipsShell";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { tagTone } from "@/domains/tags/exports/tagTone";
import Link from "@/components/general/Link";

type FeedFollowChipsProps = {
  filter: PostFeedFilterDto,
  authors: Pick<User, 'id' | 'name' | 'avatarKey'>[],
  tags: Pick<Tag, 'id' | 'name' | 'slug'>[]
}

// Сколько подписок видно сразу, остальные — под «ещё N» (выбранная видна всегда)
const VISIBLE = 6;

/*
  Чипы «Моей ленты» (спека 42): «Все», мои авторы, мои рубрики. Выбор один: чип автора
  сбрасывает рубрики и наоборот. Поиск, тип, сортировка и период сохраняются, загруженное
  число — нет
*/
export default function FeedFollowChips({ filter, authors, tags }: FeedFollowChipsProps) {
  const base = { ...filter, author: undefined, tag: [], limit: undefined };
  const chips = [
    ...authors.map(author => ({
      key: `author-${author.id}`,
      active: filter.author === author.id,
      href: feedUrl({ ...base, author: author.id }),
      tone: undefined,
      label: <><UserAvatar name={author.name} avatarKey={author.avatarKey} size={28} />{ author.name }</>
    })),
    ...tags.map(tag => ({
      key: `tag-${tag.id}`,
      active: filter.tag.includes(tag.slug),
      href: feedUrl({ ...base, tag: [ tag.slug ] }),
      tone: tagTone(tag.id),
      label: <>#{ tag.name }</>
    }))
  ];
  const hidden = chips.map((chip, i) => i >= VISIBLE && !chip.active);

  return (
    <FeedFollowChipsShell extra={hidden.filter(Boolean).length}>
      <Link href={feedUrl(base)} data-active={!filter.author && filter.tag.length === 0}>Все</Link>
      { chips.map((chip, i) => (
        <Link
          key={chip.key}
          href={chip.href}
          data-active={chip.active}
          data-tone={chip.tone}
          data-avatar={chip.tone ? undefined : true}
          data-extra={hidden[i] || undefined}
          aria-current={chip.active ? 'true' : undefined}
        >
          { chip.label }
        </Link>
      )) }
    </FeedFollowChipsShell>
  );
}
