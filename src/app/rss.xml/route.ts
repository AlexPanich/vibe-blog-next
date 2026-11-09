import { siteConfig } from "@/config/site";
import { rssResponse } from "@/domains/posts/shared/postRss";

// Кэш — в памяти (postRss.ts): статический route запёк бы ленту при сборке
export const dynamic = 'force-dynamic';

export async function GET(){
  return rssResponse({ key: 'all', title: 'Vibe', link: '/', selfPath: '/rss.xml', description: siteConfig.description });
}
