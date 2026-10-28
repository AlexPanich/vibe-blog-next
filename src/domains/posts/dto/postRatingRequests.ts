import z from "zod";

/*
  0 — снять оценку
*/
export const postRateDto = z.object({
  value: z.int().min(0).max(5)
})

export type PostRateDto = z.infer<typeof postRateDto>
