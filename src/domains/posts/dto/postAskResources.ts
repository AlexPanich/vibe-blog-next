import z from "zod";
import { postCoverResource } from "@/domains/posts/dto/postResources";

/*
  Источник ответа (спека 57, п. 9, план 57, реш. 12): n — номер сноски в тексте. Без дат:
  поток — JSON, а z.date() строку не пропустит
*/
export const postAskSourceResource = z.object({
  n: z.number(),
  id: z.number(),
  title: z.string(),
  authorName: z.string(),
  cover: postCoverResource.nullable()
})

export type PostAskSourceResource = z.infer<typeof postAskSourceResource>

// Строка NDJSON-потока /api/ask (п. 11): источники → дельты → done либо error
export const postAskEventResource = z.discriminatedUnion('type', [
  z.object({ type: z.literal('sources'), posts: z.array(postAskSourceResource) }),
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({ type: z.literal('done') }),
  z.object({ type: z.literal('error'), message: z.string() })
])

export type PostAskEvent = z.infer<typeof postAskEventResource>
