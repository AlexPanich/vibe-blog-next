'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import { PostResource } from "@/domains/posts/dto/postResources";
import TagChips from "@/domains/tags/exports/TagChips";
import PostRatingBadge from "@/domains/posts/components/PostRatingBadge";
import PostTypeMeta from "@/domains/posts/components/PostTypeMeta";
import PostCover from "@/domains/posts/components/PostCover";
import { Button } from "@mantine/core";
import { IconCalendar, IconUser } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

export default function PostCard({ post }: { post: PostResource }) {
  const [ showDetails, setShowDetails ] = useState(false);

  return <article className="ui-card" data-cover={!!post.cover || undefined}>
    { post.cover && <Link href={`/posts/${post.id}`} tabIndex={-1} aria-hidden><PostCover cover={post.cover} /></Link> }
    <h3 className="ui-card__title">
      <Link href={`/posts/${post.id}`}>{ post.title }</Link>
    </h3>
    <div className="ui-meta">
      <span className="ui-meta__item">
        <IconCalendar size={13} stroke={1.8} />
        <LocalDate value={post.publishedAt ?? post.createdAt} options={{ dateStyle: 'medium' }} />
      </span>
      <PostTypeMeta post={post} />
      <PostRatingBadge rating={post.rating} />
      { showDetails && <span className="ui-meta__item">
        <IconUser size={13} stroke={1.8} />
        { post.author.name }
      </span> }
    </div>
    <TagChips tags={post.tags} linked />
    <div className="ui-card__foot">
      <Button size="compact-sm" variant="subtle" color="gray" onClick={() => setShowDetails(prev => !prev)}>
        { showDetails ? 'Скрыть автора' : 'Об авторе' }
      </Button>
      <Link href={`/posts/${post.id}`} className="ui-backlink">Читать</Link>
    </div>
  </article>
}
