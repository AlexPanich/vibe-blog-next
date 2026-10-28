'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { FeedAuthorsResource } from "@/domains/posts/dto/postResources";
import { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import { Select, SimpleGrid } from "@mantine/core";
import { useRouter } from "next/navigation";

type FeedControlsProps<T extends FeedAuthorsResource> = {
  filter: PostFeedFilterDto,
  authors: StrictResource<T, FeedAuthorsResource>
}

const SORTS = [
  { value: 'new', label: 'Новые' },
  { value: 'old', label: 'Старые' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'author', label: 'По автору' },
];

const PERIODS = [
  { value: '', label: 'Всё время' },
  { value: 'week', label: 'За неделю' },
  { value: 'month', label: 'За месяц' },
  { value: 'year', label: 'За год' },
];

// Сортировка, автор и период. Выбор сразу ведёт на новый URL без limit — список начинается заново.
export default function FeedControls<T extends FeedAuthorsResource>({ filter, authors }: FeedControlsProps<T>) {
  const router = useRouter();
  const go = (patch: Partial<PostFeedFilterDto>) => router.push(feedUrl({ ...filter, ...patch, limit: undefined }));
  const authorOptions = [ { value: '', label: 'Все авторы' }, ...authors.map(a => ({ value: String(a.id), label: a.name })) ];

  return (
    <SimpleGrid className="ui-feed-controls" cols={{ base: 1, sm: 3 }} spacing="sm">
      <Select
        label="Сортировка"
        data={SORTS}
        value={filter.sort}
        allowDeselect={false}
        onChange={value => go({ sort: (value ?? 'new') as PostFeedFilterDto['sort'] })}
      />
      <Select
        label="Автор"
        data={authorOptions}
        value={filter.author ? String(filter.author) : ''}
        allowDeselect={false}
        searchable
        onChange={value => go({ author: value ? Number(value) : undefined })}
      />
      <Select
        label="Период"
        data={PERIODS}
        value={filter.period ?? ''}
        allowDeselect={false}
        onChange={value => go({ period: (value || undefined) as PostFeedFilterDto['period'] })}
      />
    </SimpleGrid>
  );
}
