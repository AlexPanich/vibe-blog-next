import z from "zod";
import { NOTIFICATION_TABS } from "@/domains/notifications/shared/notificationTabs";

export const notificationReadDto = z.object({
  id: z.int().positive()
})

export type NotificationReadDto = z.infer<typeof notificationReadDto>

/*
  Порция: строки старше beforeId. unreadOnly — колокольчик, без него — история (спека 29);
  tab — вкладка истории (спека 44)
*/
export const notificationPageDto = z.object({
  beforeId: z.int().positive().optional(),
  unreadOnly: z.boolean().optional(),
  tab: z.enum(NOTIFICATION_TABS).optional()
})

export type NotificationPageDto = z.infer<typeof notificationPageDto>

// «Прочитать все»: без tab — все, с tab — только вкладка (спека 44)
export const notificationReadAllDto = z.object({
  tab: z.enum(NOTIFICATION_TABS).optional()
})

// Вкладка истории из searchParams: мусор — «Все», а не 404
export const notificationFilterDto = z.object({
  tab: z.enum(NOTIFICATION_TABS).optional().catch(undefined)
})
