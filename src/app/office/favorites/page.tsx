import { db } from "@/globals/db";
import { postFavorites, posts } from "@/database/schema";
import { requireAuthUser } from "@/shared/auth";
import PostFavoriteRemove from "@/domains/posts/components/PostFavoriteRemove";
import LocalDate from "@/components/general/LocalDate";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import { stripMarkdown } from "@/core/markdown";
import { and, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { IconBookmark, IconCalendar } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Избранное' };

export default async function OfficeFavorites() {
  const user = await requireAuthUser();

  // Только опубликованные: ушедший из ленты пост остаётся в закладках, но не показывается
  const list = await db.select({ id: posts.id, title: posts.title, content: posts.content, addedAt: postFavorites.createdAt })
    .from(postFavorites)
    .innerJoin(posts, and(eq(posts.id, postFavorites.postId), eq(posts.status, 'published')))
    .where(eq(postFavorites.userId, user.id))
    // createdAt — с точностью до секунды; при равенстве порядок вставки
    .orderBy(desc(postFavorites.createdAt), desc(sql`${postFavorites}.rowid`));

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Избранное</h1>
        <span className="ui-kicker">Постов: { list.length }</span>
      </div>

      { list.length === 0 ? (
        <EmptyState
          icon={IconBookmark}
          title="Вы пока ничего не отложили"
          action={<ButtonLink href="/posts" variant="default">В ленту</ButtonLink>}
        >
          Добавить в избранное можно кнопкой «В избранное» на странице поста.
        </EmptyState>
      ) : (
        <div className="ui-rows">
          { list.map(post => (
            <div key={post.id} className="ui-row">
              <div className="ui-row__body">
                <h3 className="ui-row__title"><Link href={`/posts/${post.id}`}>{ post.title }</Link></h3>
                <p className="ui-row__excerpt">{ stripMarkdown(post.content) }</p>
              </div>
              <div className="ui-row__aside">
                <PostFavoriteRemove id={post.id} />
                <span className="ui-meta ui-meta__item">
                  <IconCalendar size={13} stroke={1.8} />Добавлен <LocalDate value={post.addedAt} options={{ dateStyle: 'medium' }} />
                </span>
              </div>
            </div>
          )) }
        </div>
      ) }
    </>
  );
}
