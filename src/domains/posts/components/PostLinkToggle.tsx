'use client'

import 'client-only';
import { PostLinkResource } from "@/domains/posts/dto/postResources";
import { StrictResource } from "@/core/resource";
import { Button } from "@mantine/core";
import Link from "@/components/general/Link";
import { useState } from "react";

type PostLinkToggleProps<T extends PostLinkResource> = {
  post: StrictResource<T, PostLinkResource>
}

export default function PostLinkToggle<T extends PostLinkResource>({ post }: PostLinkToggleProps<T>) {
  const [ showLink, setShowLink ] = useState(false);

  if(showLink){
    return <Link href={`/posts/${post.id}`}>Открыть пост</Link>
  }

  return <Button size="compact-sm" variant="subtle" color="gray" onClick={() => setShowLink(true)}>
    Показать ссылку
  </Button>
}
