'use client'

import 'client-only';
import Link from "@/components/general/Link";
import { SITE_PAGES, type SitePageSlug } from "@/domains/site-pages/shared/sitePages";
import { IconInfoCircle, IconListCheck, IconMail, IconShieldCheck, type Icon } from "@tabler/icons-react";
import { usePathname } from "next/navigation";

const ICONS: Record<SitePageSlug, Icon> = {
  about: IconInfoCircle,
  rules: IconListCheck,
  moderation: IconShieldCheck,
  contacts: IconMail
};

/*
  Меню раздела «О блоге»: на широком экране — колонка слева, на телефоне — чипы со скроллом
  под шапкой. Разметка одна, вид задаёт CSS
*/
export default function SitePagesNav() {
  const pathname = usePathname();

  return (
    <nav className="ui-site-nav" aria-label="О блоге">
      <p className="ui-site-nav__kicker">О блоге</p>
      { SITE_PAGES.map(page => {
        const PageIcon = ICONS[page.slug];

        return (
          <Link key={page.slug} href={page.href} className="ui-site-nav__item" data-active={pathname === page.href || undefined}>
            <PageIcon className="ui-site-nav__icon" size={18} stroke={1.8} aria-hidden />
            { page.label }
          </Link>
        );
      }) }
    </nav>
  );
}
