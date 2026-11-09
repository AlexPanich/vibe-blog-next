import SitePageMarkdown from "@/domains/site-pages/components/SitePageMarkdown";
import { loadSitePage } from "@/domains/site-pages/shared/loadSitePage";
import { sitePage, type SitePageSlug } from "@/domains/site-pages/shared/sitePages";
import type { ReactNode } from "react";

// Колонка страницы о блоге: kicker, заголовок, текст из .md (первый абзац — lead) и блоки после него
export default async function SitePageArticle({ slug, children }: { slug: SitePageSlug, children?: ReactNode }) {
  const page = sitePage(slug);
  const content = await loadSitePage(slug);

  return (
    <article className="ui-site-page">
      <p className="ui-site-page__kicker">{ page.kicker }</p>
      <h1 className="ui-site-page__title">{ page.title }</h1>
      <div className="ui-site-page__body">
        <SitePageMarkdown content={content} />
      </div>
      { children }
    </article>
  );
}
