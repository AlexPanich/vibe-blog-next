import { resource } from "@/core/resource";
import { postResource } from "@/domains/posts/dto/postResources";
import { loadFavorites } from "@/domains/posts/shared/loadFavorites";
import PostCardBridge from "@/domains/posts/components/PostCardBridge";
import { getAuthor } from "@/domains/users/shared/getAuthor";
import UserBlockProvider from "@/domains/users/components/block/UserBlockProvider";
import UserBlockGate from "@/domains/users/components/block/UserBlockGate";
import UserBlockButton from "@/domains/users/components/block/UserBlockButton";
import Link from "@/components/general/Link";
import { idOrFail } from "@/shared/params";
import { IconArrowLeft } from "@tabler/icons-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Без searchParams Next закэшировал бы страницу, а избранное меняется
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/authors/[id]/favorites'>): Promise<Metadata> {
  const author = await getAuthor(idOrFail((await params).id));

  return { title: `Избранное · ${author.name}` };
}

/*
  Всё избранное автора (спека 40): только если он его открыл и там есть опубликованные посты,
  иначе 404 — всем, владельцу тоже (сервер сессию здесь не читает)
*/
export default async function AuthorFavorites({ params }: PageProps<'/authors/[id]/favorites'>) {
  const author = await getAuthor(idOrFail((await params).id));

  if(!author.favoritesPublic){
    notFound();
  }

  const list = await loadFavorites(author.id);

  if(list.length === 0){
    notFound();
  }

  return (
    <UserBlockProvider authorId={author.id} authorName={author.name}>
      <Link href={`/authors/${author.id}`} className="ui-backlink">
        <IconArrowLeft size={15} />Страница автора
      </Link>

      <div className="ui-section-head">
        <div>
          <p className="ui-kicker">{ author.name }</p>
          <h1 className="ui-title">Избранное</h1>
        </div>
      </div>
      {/* Строка «в вашем списке блокировок · Разблокировать»: без неё у блокирующего пустая страница */}
      <UserBlockButton />

      <UserBlockGate>
        <div className="ui-post-grid ui-author-posts">
          { list.map(({ post }) => <PostCardBridge key={post.id} post={resource(postResource, post)} />) }
        </div>
      </UserBlockGate>
    </UserBlockProvider>
  );
}
