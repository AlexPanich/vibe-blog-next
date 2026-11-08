import Link from "@/components/general/Link";
import type { PostType } from "@/database/schema";

type AuthorPostTabsProps = {
  authorId: number,
  // Опубликованные посты автора по типам
  counts: Record<PostType, number>,
  active: PostType | undefined
}

// Порядок и подписи как в макете; обычные посты — только во «всех»
const TABS: { type: PostType, label: string }[] = [
  { type: 'travel',    label: 'Путешествия' },
  { type: 'translate', label: 'Переводы' }
];

/*
  Вкладки постов на странице автора (спека 30): «Посты · N» и типы, которые у автора есть.
  Ссылки с ?type= на ту же страницу; если кроме «всех» вкладок нет — ряда нет.
  Без 'use client' — рендерит серверная страница
*/
export default function AuthorPostTabs({ authorId, counts, active }: AuthorPostTabsProps) {
  const total = counts.simple + counts.travel + counts.translate;
  const tabs = TABS.filter(tab => counts[tab.type] > 0);

  if(tabs.length === 0 && !active){
    return null;
  }

  return (
    <nav className="ui-author-tabs" aria-label="Посты автора">
      <Link href={`/authors/${authorId}`} scroll={false} aria-current={active ? undefined : 'page'}>Посты · { total }</Link>
      { tabs.map(tab => <Link key={tab.type} href={`/authors/${authorId}?type=${tab.type}`} scroll={false} aria-current={active === tab.type ? 'page' : undefined}>
        { tab.label } · { counts[tab.type] }
      </Link>) }
    </nav>
  );
}
