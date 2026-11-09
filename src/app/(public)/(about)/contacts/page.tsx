import { contactsConfig } from "@/config/contacts";
import SiteContacts from "@/domains/site-pages/components/SiteContacts";
import SitePageArticle from "@/domains/site-pages/components/SitePageArticle";
import { sitePage } from "@/domains/site-pages/shared/sitePages";
import type { Metadata } from "next";

// Контакты берутся из env при запуске, а не при сборке
export const dynamic = 'force-dynamic';

const page = sitePage('contacts');

export const metadata: Metadata = { title: page.label, description: page.description };

export default function ContactsPage() {
  return (
    <SitePageArticle slug="contacts">
      <SiteContacts email={contactsConfig.email} userId={contactsConfig.userId} />
    </SitePageArticle>
  );
}
