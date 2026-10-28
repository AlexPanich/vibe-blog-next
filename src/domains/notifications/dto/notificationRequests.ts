import z from "zod";

export const notificationReadDto = z.object({
  id: z.int().positive()
})

export type NotificationReadDto = z.infer<typeof notificationReadDto>

// Порция: строки старше beforeId. unreadOnly — колокольчик, без него — история (спека 29)
export const notificationPageDto = z.object({
  beforeId: z.int().positive().optional(),
  unreadOnly: z.boolean().optional()
})

export type NotificationPageDto = z.infer<typeof notificationPageDto>
