import z from "zod";

export const TAG_SORTS = [ 'posts', 'followers', 'name' ] as const;

export type TagSort = typeof TAG_SORTS[number];

export const TAG_SORT_LABELS: Record<TagSort, string> = {
  posts: 'По числу постов',
  followers: 'По подписчикам',
  name: 'По алфавиту',
};

/*
  Фильтр справочника рубрик из searchParams (спека 42, шаг 16): поиск по названию и slug,
  сортировка. Мусор в URL — значение по умолчанию, а не 404
*/
export const tagModerationFilterDto = z.object({
  q: z.string().trim().max(100).optional().transform(v => v || undefined).catch(undefined),
  sort: z.enum(TAG_SORTS).catch('posts').default('posts'),
})

export type TagModerationFilterDto = z.infer<typeof tagModerationFilterDto>


// Слияние рубрик (спека 47): исходная — bind-аргумент, целевая — здесь
export const tagMergeDto = z.object({
  targetId: z.int().positive()
})

export type TagMergeDto = z.infer<typeof tagMergeDto>
