import 'server-only';
import type { SitePageSlug } from "@/domains/site-pages/shared/sitePages";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

/*
  Текст страницы о блоге — src/content/<slug>.md, правка — коммитом. Читается в рантайме:
  standalone-сборка файл не трассирует, его копирует Dockerfile. slug — только из реестра
*/
export const loadSitePage = cache(async (slug: SitePageSlug) => {
  return readFile(path.join(process.cwd(), 'src', 'content', `${slug}.md`), 'utf8');
});
