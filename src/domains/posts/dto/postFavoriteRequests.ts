import z from "zod";

// Сортировка избранного (спека 44): по дате закладки (по умолчанию) или публикации поста
export const FAVORITE_SORTS = [ 'added', 'published' ] as const;

export type FavoriteSort = (typeof FAVORITE_SORTS)[number];

export const FAVORITE_SORT_LABELS: Record<FavoriteSort, string> = {
  added: 'Сначала новые',
  published: 'По дате публикации',
};

/*
  Фильтр избранного из searchParams (спека 44): рубрика (slug) и сортировка. Мусор в URL —
  значение по умолчанию, а не 404
*/
export const favoriteFilterDto = z.object({
  tag: z.string().trim().max(80).optional().transform(v => v || undefined).catch(undefined),
  sort: z.enum(FAVORITE_SORTS).catch('added').default('added'),
})

export type FavoriteFilterDto = z.infer<typeof favoriteFilterDto>
