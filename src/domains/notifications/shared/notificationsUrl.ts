import type { NotificationTab } from "@/domains/notifications/shared/notificationTabs";

// URL истории уведомлений: «Все» — без параметра (спека 44)
export function notificationsUrl({ tab }: { tab?: NotificationTab }){
  return tab ? `/office/notifications?tab=${tab}` as const : '/office/notifications' as const;
}
