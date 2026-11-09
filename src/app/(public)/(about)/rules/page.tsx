import SitePageArticle from "@/domains/site-pages/components/SitePageArticle";
import { sitePage } from "@/domains/site-pages/shared/sitePages";
import type { Metadata } from "next";

const page = sitePage('rules');

export const metadata: Metadata = { title: page.label, description: page.description };

export default function RulesPage() {
  return (
    <SitePageArticle slug="rules" />
  );
}
