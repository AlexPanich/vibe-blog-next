import { requireAuthUser } from "@/shared/auth";
import { db } from "@/globals/db";
import { posts } from "@/database/schema";
import { desc, eq } from "drizzle-orm";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import PostRow from "@/domains/posts/components/PostRow";
import { IconChessKnight, IconPencilPlus } from "@tabler/icons-react";
import { createPost } from "@/domains/posts/policy";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Мои посты' };

export default async function OfficePosts() {
  const user = await requireAuthUser();
  const canCreate = createPost(user);
  const myPosts = await db.query.posts.findMany({
    where: eq(posts.userId, user.id),
    orderBy: desc(posts.createdAt)
  });

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Мои посты</h1>
        { canCreate && <ButtonLink href="/office/posts/create" size="sm" leftSection={<IconPencilPlus size={16} />}>
          Новый пост
        </ButtonLink> }
      </div>

      {/* Подсказка живёт, пока постов нет, — без флага «уже показывали» (спека 27) */}
      { myPosts.length === 0 ? (canCreate ? (
        <EmptyState
          icon={IconChessKnight}
          title="Начните с первого поста"
          action={<ButtonLink href="/office/posts/create" leftSection={<IconPencilPlus size={16} />}>Написать первый пост</ButtonLink>}
        >
          Пост уходит на проверку модератору — читатели увидят его после публикации. Пока пост
          в черновике, его видите только вы.
        </EmptyState>
      ) : (
        <EmptyState
          icon={IconChessKnight}
          title="Постов нет"
          action={<ButtonLink href="/office/author-request" variant="default">Заявка в авторы</ButtonLink>}
        >
          Писать посты могут авторы — роль выдаёт администратор по заявке.
        </EmptyState>
      )) : (
        <div className="ui-rows">
          { myPosts.map(post => <PostRow key={post.id} post={post} href={`/office/posts/${post.id}`} />) }
        </div>
      ) }
    </>
  );
}
