import z from "zod";
import { tagRowResource } from "@/domains/tags/dto/tagResources";

/*
  Строка справочника рубрик: постов всех статусов (удаление снимет рубрику и с черновиков)
  и подписчиков
*/
export const tagModerationRowResource = tagRowResource.extend({
  followersCount: z.number()
})

export type TagModerationRowResource = z.infer<typeof tagModerationRowResource>
