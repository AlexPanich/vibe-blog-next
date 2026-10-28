import z from "zod";

export const aiIdSchema = z.int().positive();

/* Не в TagPicker: файл с 'use client' отдал бы серверу client reference вместо числа */
export const TAGS_PER_POST = 3;

export const tagDto = z.object({
  name: z.string().trim().min(2, 'От 2 до 30 символов').max(30, 'От 2 до 30 символов')
})

export type TagDto = z.infer<typeof tagDto>
