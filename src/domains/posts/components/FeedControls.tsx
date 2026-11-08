'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { FeedAuthorsResource } from "@/domains/posts/dto/postResources";
import { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import { POST_TYPE_TABS } from "@/domains/posts/shared/postTypes";
import { Select } from "@mantine/core";
import { useRouter } from "next/navigation";

type FeedControlsProps<T extends FeedAuthorsResource> = {
  filter: PostFeedFilterDto,
  // Без авторов списка «Автор» нет: в «Моей ленте» автора выбирают чипы подписок
  authors?: StrictResource<T, FeedAuthorsResource>
}

const TYPES = POST_TYPE_TABS.map(({ type, label }) => ({ value: type ?? '', label: type ? label : 'Любой тип' }));

const PERIODS = [
  { value: '', label: 'Всё время' },
  { value: 'week', label: 'За неделю' },
  { value: 'month', label: 'За месяц' },
  { value: 'year', label: 'За год' },
];

/*
  Тип, автор и период — компактные списки-пилюли рядом с поиском, подписи в aria-label.
  Выбор сразу ведёт на новый URL без limit — список начинается заново
*/
export default function FeedControls<T extends FeedAuthorsResource>({ filter, authors }: FeedControlsProps<T>) {
  const router = useRouter();
  const go = (patch: Partial<PostFeedFilterDto>) => router.push(feedUrl({ ...filter, ...patch, limit: undefined }));
  const authorOptions = authors && [ { value: '', label: 'Все авторы' }, ...authors.map(a => ({ value: String(a.id), label: a.name })) ];
  const common = { size: 'sm', radius: 'xl', allowDeselect: false, className: 'ui-feed-select', comboboxProps: { width: 'max-content' } } as const;

  return (
    <div className="ui-feed-controls">
      <Select
        {...common}
        aria-label="Тип поста"
        data={TYPES}
        value={filter.type ?? ''}
        onChange={value => go({ type: (value || undefined) as PostFeedFilterDto['type'] })}
      />
      { authorOptions && <Select
        {...common}
        aria-label="Автор"
        data={authorOptions}
        value={filter.author ? String(filter.author) : ''}
        searchable
        onChange={value => go({ author: value ? Number(value) : undefined })}
      /> }
      <Select
        {...common}
        aria-label="Период"
        data={PERIODS}
        value={filter.period ?? ''}
        onChange={value => go({ period: (value || undefined) as PostFeedFilterDto['period'] })}
      />
    </div>
  );
}
