import SitePageArticle from "@/domains/site-pages/components/SitePageArticle";
import SiteWriteCta from "@/domains/site-pages/components/SiteWriteCta";
import { sitePage } from "@/domains/site-pages/shared/sitePages";
import type { Metadata } from "next";

const page = sitePage('about');

export const metadata: Metadata = { title: page.label, description: page.description };

export default function AboutPage() {
  return (
    <SitePageArticle slug="about">
      <SiteWriteCta />
    </SitePageArticle>
  );
}
