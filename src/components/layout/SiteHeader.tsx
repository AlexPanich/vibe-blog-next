import Brand from "@/components/layout/Brand";
import TopMenu from "@/components/navigation/TopMenu";
import ColorSchemeToggle from "@/components/general/ColorSchemeToggle";
import UserBox from "@/domains/users/exports/UserBox";
import NotificationBell from "@/domains/notifications/exports/NotificationBell";
import NotificationToasts from "@/domains/notifications/exports/NotificationToasts";
import MessageToasts from "@/domains/messages/exports/MessageToasts";

type SiteHeaderProps = {
  // Непрочитанные уведомления, если layout их уже знает (кабинет)
  unread?: number
}

// Шапка обоих root layout: бренд, меню по центру, справа тема, уведомления и пользователь.
export default function SiteHeader({ unread }: SiteHeaderProps) {
  return (
    <header className="ui-masthead">
      <div className="ui-shell ui-masthead__row">
        <Brand />
        <TopMenu />
        <div className="ui-masthead__aside">
          <ColorSchemeToggle />
          <NotificationBell initialUnread={unread} />
          <UserBox />
        </div>
        { /* Без разметки: показывают тосты. Гостю эти события не приходят */ }
        <NotificationToasts />
        <MessageToasts />
      </div>
    </header>
  );
}
