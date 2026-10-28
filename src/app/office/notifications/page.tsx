import { requireAuthUser } from "@/shared/auth";
import { resource } from "@/core/resource";
import NotificationList from "@/domains/notifications/components/NotificationList";
import { notificationPageResource } from "@/domains/notifications/dto/notificationResources";
import { loadNotificationPage } from "@/domains/notifications/shared/loadNotifications";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Уведомления' };

export default async function OfficeNotifications() {
  const user = await requireAuthUser();
  const { items, hasMore } = loadNotificationPage(user.id);

  return <NotificationList page={resource(notificationPageResource, { items, hasMore })} />;
}
