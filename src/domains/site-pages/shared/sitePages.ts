import type { Route } from "next";

export const SITE_PAGE_SLUGS = [ 'about', 'rules', 'moderation', 'contacts' ] as const;

export type SitePageSlug = typeof SITE_PAGE_SLUGS[number];

export type SitePage = {
  slug: SitePageSlug,
  href: Route,
  // Пункт меню раздела и подвала
  label: string,
  kicker: string,
  title: string,
  description: string
}

/*
  Страницы о блоге (спека 31): заголовок, kicker и description живут здесь, в
  src/content/<slug>.md — только lead (первый абзац) и тело. Иконки пунктов — в SitePagesNav:
  компоненты в реестре данных не держим
*/
export const SITE_PAGES: SitePage[] = [
  {
    slug: 'about',
    href: '/about',
    label: 'О блоге',
    kicker: 'О блоге',
    title: 'Блог живых историй',
    description: 'Что такое Vibe, как устроены посты, модерация и подписки и кто делает блог.'
  },
  {
    slug: 'rules',
    href: '/rules',
    label: 'Правила',
    kicker: 'Правила',
    title: 'Правила Vibe',
    description: 'Что можно и что нельзя публиковать в Vibe, правила комментариев и сообщений и что бывает за нарушения.'
  },
  {
    slug: 'moderation',
    href: '/moderation',
    label: 'Модерация',
    kicker: 'Модерация',
    title: 'Как устроена модерация',
    description: 'Как пост попадает в ленту: очередь модерации, что проверяем, отклонение, блокировка и жалобы.'
  },
  {
    slug: 'contacts',
    href: '/contacts',
    label: 'Контакты',
    kicker: 'Контакты',
    title: 'Связаться с нами',
    description: 'Как связаться с командой Vibe: почта и личное сообщение администрации.'
  }
];

export function sitePage(slug: SitePageSlug): SitePage {
  return SITE_PAGES.find(page => page.slug === slug) as SitePage;
}
