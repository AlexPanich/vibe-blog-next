import LocalDate from "@/components/general/LocalDate";
import type { Post } from "@/database/types";
import PostStatusTag from "@/domains/posts/components/PostStatusTag";
import PostTypeMeta from "@/domains/posts/components/PostTypeMeta";
import TagChips from "@/domains/tags/exports/TagChips";
import type { Tag } from "@/database/types";
import { IconCalendar, IconEye, IconUser } from "@tabler/icons-react";
import type { Route } from "next";
import { stripMarkdown } from "@/core/markdown";
import Link from "@/components/general/Link";

type PostRowProps<T extends string> = {
  post: Pick<Post, 'url' | 'title' | 'content' | 'status' | 'createdAt' | 'type' | 'source' | 'lat' | 'lng'>,
  href: Route<T>,
  author?: string,
  tags?: Pick<Tag, 'id' | 'name' | 'slug'>[],
  // Кто ведёт ревью — в очереди модерации
  reviewer?: string
}

// Строка поста в списках кабинета: свои посты, очередь модерации, админка.
export default function PostRow<T extends string>({ post, href, author, tags = [], reviewer }: PostRowProps<T>) {
  return (
    <Link href={href} className="ui-row">
      <div className="ui-row__body">
        <h3 className="ui-row__title">{ post.title }</h3>
        <div className="ui-meta">
          <span>/{ post.url }</span>
          <PostTypeMeta post={post} compact />
          { author && <span className="ui-meta__item">
            <IconUser size={13} stroke={1.8} />{ author }
          </span> }
          { reviewer && <span className="ui-meta__item">
            <IconEye size={13} stroke={1.8} />На ревью: { reviewer }
          </span> }
          <TagChips tags={tags} />
        </div>
        <p className="ui-row__excerpt">{ stripMarkdown(post.content) }</p>
      </div>
      <div className="ui-row__aside">
        <PostStatusTag status={post.status} />
        <span className="ui-meta ui-meta__item">
          <IconCalendar size={13} stroke={1.8} />
          <LocalDate value={post.createdAt} options={{ dateStyle: 'medium' }} />
        </span>
      </div>
    </Link>
  );
}
