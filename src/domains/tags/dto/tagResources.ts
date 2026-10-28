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
  Строка справочника: число постов нужно для подтверждения удаления
*/
export const tagRowResource = tagResource.extend({
  postsCount: z.number()
})

export type TagRowResource = z.infer<typeof tagRowResource>
