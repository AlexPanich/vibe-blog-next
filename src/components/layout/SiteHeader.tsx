import Brand from "@/components/layout/Brand";
import TopMenu from "@/components/navigation/TopMenu";
import ColorSchemeToggle from "@/components/general/ColorSchemeToggle";
import Link from "@/components/general/Link";
import UserBox from "@/domains/users/exports/UserBox";
import NotificationBell from "@/domains/notifications/exports/NotificationBell";
import NotificationToasts from "@/domains/notifications/exports/NotificationToasts";
import MessageToasts from "@/domains/messages/exports/MessageToasts";
import { IconSearch } from "@tabler/icons-react";

type SiteHeaderProps = {
  // Непрочитанные уведомления, если layout их уже знает (кабинет)
  unread?: number
}

// Шапка обоих root layout: бренд, меню по центру, справа поиск, тема, уведомления и пользователь.
export default function SiteHeader({ unread }: SiteHeaderProps) {
  return (
    <header className="ui-masthead">
      <div className="ui-shell ui-masthead__row">
        <Brand />
        <TopMenu />
        <div className="ui-masthead__aside">
          { /* Поиск живёт в ленте: кнопка ведёт туда, поле — там */ }
          <Link href="/posts" className="ui-round-icon" aria-label="Поиск по постам" title="Поиск по постам">
            <IconSearch size={18} aria-hidden />
          </Link>
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
