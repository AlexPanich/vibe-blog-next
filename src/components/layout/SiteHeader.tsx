import Brand from "@/components/layout/Brand";
import HeaderSearch from "@/components/layout/HeaderSearch";
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

// Шапка обоих root layout: бренд, меню по центру, справа поиск, тема, уведомления и пользователь.
// Строку строит клиентский HeaderSearch: поиск раскрывается на месте меню (спека 33).
export default function SiteHeader({ unread }: SiteHeaderProps) {
  return (
    <header className="ui-masthead">
      <HeaderSearch
        brand={<Brand />}
        menu={<TopMenu />}
        aside={<>
          <ColorSchemeToggle />
          <NotificationBell initialUnread={unread} />
          <UserBox />
        </>}
      />
      { /* Без разметки: показывают тосты. Гостю эти события не приходят */ }
      <NotificationToasts />
      <MessageToasts />
    </header>
  );
}
