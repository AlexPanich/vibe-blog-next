import Link from "@/components/general/Link";
import { SITE_PAGES } from "@/domains/site-pages/exports/sitePages";
import { IconRss } from "@tabler/icons-react";

/*
  Подвал публичной части: знак, подпись и страницы о блоге. «О блоге» — только на телефоне:
  на широком экране он в шапке. RSS — обычный <a>: это route handler, не страница
*/
export default function SiteFooter() {
  return (
    <footer className="ui-footer">
      <div className="ui-shell ui-footer__row">
        <div className="ui-footer__brand">
          <span className="ui-brand__mark ui-brand__mark--small" aria-hidden>V</span>
          <span>vibe · блог живых историй · { new Date().getFullYear() }</span>
        </div>
        <nav className="ui-footer__links" aria-label="Разделы в подвале">
          { SITE_PAGES.map(page => (
            <Link key={page.slug} href={page.href} className={page.slug === 'about' ? 'ui-footer__mobile-only' : undefined}>
              { page.label }
            </Link>
          )) }
          <a href="/rss.xml" className="ui-footer__rss"><IconRss size={15} stroke={1.8} /> RSS</a>
        </nav>
      </div>
    </footer>
  );
}
