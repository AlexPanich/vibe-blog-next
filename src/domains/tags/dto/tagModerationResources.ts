import z from "zod";
import { tagRowResource } from "@/domains/tags/dto/tagResources";

/*
  Строка справочника рубрик: постов всех статусов (удаление снимет рубрику и с черновиков)
  и подписчиков. similarTo — подсказка о похожей рубрике (спека 47)
*/
export const tagModerationRowResource = tagRowResource.extend({
  followersCount: z.number(),
  similarTo: z.object({ id: z.number(), name: z.string() }).nullable()
})

export type TagModerationRowResource = z.infer<typeof tagModerationRowResource>
