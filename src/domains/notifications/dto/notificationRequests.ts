import z from "zod";

export const notificationReadDto = z.object({
  id: z.int().positive()
})

export type NotificationReadDto = z.infer<typeof notificationReadDto>

// Порция панели: строки старше beforeId
export const notificationPageDto = z.object({
  beforeId: z.int().positive().optional()
})

export type NotificationPageDto = z.infer<typeof notificationPageDto>
