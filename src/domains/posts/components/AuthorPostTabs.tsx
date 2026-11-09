import Link from "@/components/general/Link";
import type { PostType } from "@/database/schema";
import AuthorTabsNav from "@/domains/posts/components/AuthorTabsNav";

type AuthorPostTabsProps = {
  authorId: number,
  // Опубликованные посты автора по типам
  counts: Record<PostType, number>,
  active: PostType | 'favorites' | undefined,
  // Опубликованные посты в избранном, если автор его открыл; закрыто — null
  favorites: number | null
}

// Порядок и подписи как в макете; обычные посты — только во «всех»
const TABS: { type: PostType, label: string }[] = [
  { type: 'travel',    label: 'Путешествия' },
  { type: 'translate', label: 'Переводы' }
];

/*
  Вкладки постов на странице автора (спека 30): «Посты · N», типы, которые у автора есть, и
  «Избранное · N», если автор его открыл (спека 40). Ссылки с ?type= / ?tab= на ту же страницу;
  если кроме «всех» вкладок нет — ряда нет. Владельцу с закрытым или пустым избранным вкладку
  «видно только вам» дорисовывает AuthorTabsNav на клиенте: сервер сессию здесь не читает.
  Без 'use client' — рендерит серверная страница
*/
export default function AuthorPostTabs({ authorId, counts, active, favorites }: AuthorPostTabsProps) {
  const total = counts.simple + counts.travel + counts.translate;
  const tabs = TABS.filter(tab => counts[tab.type] > 0);
  const hasFavorites = favorites !== null && favorites > 0;
  const visible = tabs.length > 0 || active !== undefined || hasFavorites;

  return (
    <AuthorTabsNav authorId={authorId} visible={visible} ownFavorites={!hasFavorites}>
      <Link href={`/authors/${authorId}`} scroll={false} aria-current={active ? undefined : 'page'}>Посты · { total }</Link>
      { tabs.map(tab => <Link key={tab.type} href={`/authors/${authorId}?type=${tab.type}`} scroll={false} aria-current={active === tab.type ? 'page' : undefined}>
        { tab.label } · { counts[tab.type] }
      </Link>) }
      { hasFavorites && <Link href={`/authors/${authorId}?tab=favorites`} scroll={false} aria-current={active === 'favorites' ? 'page' : undefined}>
        Избранное · { favorites }
      </Link> }
    </AuthorTabsNav>
  );
}
