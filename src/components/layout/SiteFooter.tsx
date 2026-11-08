import type { Route } from "next";
import Link from "@/components/general/Link";

const links: { label: string, href: Route }[] = [
  { label: 'Посты', href: '/posts' },
  { label: 'Авторы', href: '/authors' },
  { label: 'Стать автором', href: '/office/author-request' },
];

// Подвал публичной части: знак, подпись и ссылки на разделы.
export default function SiteFooter() {
  return (
    <footer className="ui-footer">
      <div className="ui-shell ui-footer__row">
        <div className="ui-footer__brand">
          <span className="ui-brand__mark ui-brand__mark--small" aria-hidden>V</span>
          <span>vibe · блог живых историй · { new Date().getFullYear() }</span>
        </div>
        <nav className="ui-footer__links" aria-label="Разделы в подвале">
          { links.map(link => (
            <Link key={link.href} href={link.href}>{ link.label }</Link>
          )) }
        </nav>
      </div>
    </footer>
  );
}
