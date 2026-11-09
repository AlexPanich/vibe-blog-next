import SitePagesNav from "@/domains/site-pages/components/SitePagesNav";

// Раздел «О блоге» (спека 31): меню раздела слева, на телефоне — чипы над текстом
export default function SitePagesLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="ui-site-pages">
      <SitePagesNav />
      { children }
    </div>
  );
}
