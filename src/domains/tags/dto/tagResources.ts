import z from "zod"

export const tagResource = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string()
})

export type TagResource = z.infer<typeof tagResource>

export const tagListResource = z.array(tagResource);

export type TagListResource = z.infer<typeof tagListResource>

/*
  Рубрика с числом опубликованных постов: строка справочника (подтверждение удаления) и
  «Мои рубрики» на «Подписках»
*/
export const tagRowResource = tagResource.extend({
  postsCount: z.number()
})

export type TagRowResource = z.infer<typeof tagRowResource>

export const tagRowListResource = z.array(tagRowResource);

export type TagRowListResource = z.infer<typeof tagRowListResource>
