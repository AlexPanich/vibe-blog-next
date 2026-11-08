import z from "zod";

export const AUTHORS_SORTS = [ 'popular', 'posts', 'rating', 'name' ] as const;

export type AuthorsSort = typeof AUTHORS_SORTS[number];

/*
  Страница авторов из searchParams (спека 30): сортировка, поиск по имени, рубрика (slug).
  Битое значение не роняет страницу — у каждого поля свой catch
*/
export const authorsFilterDto = z.object({
  sort: z.enum(AUTHORS_SORTS).catch('popular').default('popular'),
  q: z.string().trim().max(100).optional().transform(v => v || undefined).catch(undefined),
  tag: z.string().trim().max(100).optional().transform(v => v || undefined).catch(undefined)
})

export type AuthorsFilterDto = z.infer<typeof authorsFilterDto>
