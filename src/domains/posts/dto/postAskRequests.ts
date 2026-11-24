import z from "zod";
import { ASK_MAX, ASK_MIN } from "@/domains/posts/shared/postAsk";

// Вопрос «Спросить блог» (спека 57, п. 4): общий у формы и route
export const postAskDto = z.object({
  question: z.string()
    .trim()
    .min(ASK_MIN, `Вопрос — хотя бы ${ASK_MIN} символов`)
    .max(ASK_MAX, `Вопрос — не длиннее ${ASK_MAX} символов`)
})

export type PostAskDto = z.infer<typeof postAskDto>
