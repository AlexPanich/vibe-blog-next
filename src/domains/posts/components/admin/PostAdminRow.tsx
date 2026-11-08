import Link from "@/components/general/Link";
import LocalDate from "@/components/general/LocalDate";
import PostStatusTag from "@/domains/posts/components/PostStatusTag";
import PostAdminMenu from "@/domains/posts/components/admin/PostAdminMenu";
import type { AdminPostRow } from "@/domains/posts/shared/loadAdminPosts";
import UserAvatar from "@/domains/users/exports/UserAvatar";

type PostAdminRowProps = {
  post: AdminPostRow,
  // Год в дате — только у постов не этого года (по часам сервера)
  year: number
}

/*
  Строка «Всех постов» (спека 42, шаг 17): заголовок и slug, автор с аватаром, статус, дата
  создания, «…». Заголовок ведёт в пост в кабинете — admin открывает его как автор
  (lifecycle поста). На телефоне статус, автор и дата — строкой под заголовком
*/
export default function PostAdminRow({ post, year }: PostAdminRowProps) {
  const date = <LocalDate
    value={post.createdAt}
    options={post.createdAt.getFullYear() === year
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: 'numeric' }}
  />;

  return (
    <div className="ui-admin-posts__row" role="row">
      <div className="ui-admin-posts__post" role="cell">
        <Link href={`/office/posts/${post.id}`} className="ui-admin-posts__title">{ post.title }</Link>
        <span className="ui-admin-posts__slug">/{ post.url }</span>
        <span className="ui-admin-posts__mobile-meta">
          <PostStatusTag status={post.status} />
          <span>{ post.author.name } · { date }</span>
        </span>
      </div>
      <span className="ui-admin-posts__author" role="cell">
        <UserAvatar name={post.author.name} avatarKey={post.author.avatarKey} size={26} />
        <span>{ post.author.name }</span>
      </span>
      <span className="ui-admin-posts__status" role="cell"><PostStatusTag status={post.status} /></span>
      <span className="ui-admin-posts__date" role="cell">{ date }</span>
      <div className="ui-admin-posts__acts" role="cell">
        <PostAdminMenu post={{ id: post.id, title: post.title, status: post.status, authorId: post.author.id }} />
      </div>
    </div>
  );
}
