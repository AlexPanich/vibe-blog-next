import z from "zod";

export const AUTHORS_SORTS = [ 'name', 'posts', 'rating' ] as const;

/*
  Сортировка страницы авторов из searchParams: неизвестное значение — по имени
*/
export const authorsFilterDto = z.object({
  sort: z.enum(AUTHORS_SORTS).catch('name').default('name')
})

export type AuthorsFilterDto = z.infer<typeof authorsFilterDto>
