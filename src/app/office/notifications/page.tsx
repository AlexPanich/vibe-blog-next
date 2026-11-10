import { requireAuthUser } from "@/shared/auth";
import { resource } from "@/core/resource";
import NotificationList from "@/domains/notifications/components/NotificationList";
import { notificationFilterDto } from "@/domains/notifications/dto/notificationRequests";
import { notificationPageResource } from "@/domains/notifications/dto/notificationResources";
import { loadNotificationPage } from "@/domains/notifications/shared/loadNotifications";
import { notificationTabsFor } from "@/domains/notifications/shared/notificationTabs";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Уведомления' };

/*
  История уведомлений: вкладки по типам (?tab=, спека 44). Чужая роли вкладка
  («Модерация» у не-staff) — «Все»
*/
export default async function OfficeNotifications({ searchParams }: PageProps<'/office/notifications'>) {
  const user = await requireAuthUser();
  const allowed = notificationTabsFor(user.roles);
  const { tab: raw } = notificationFilterDto.parse(await searchParams);
  const tab = raw && allowed.includes(raw) ? raw : undefined;

  // key — при смене вкладки список не держит состояние прошлой
  return <NotificationList
    key={tab ?? 'all'}
    tab={tab}
    tabs={allowed}
    page={resource(notificationPageResource, loadNotificationPage(user.id, { tab }))}
  />;
}
