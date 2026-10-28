'use client'

import 'client-only';
import UserGate from "@/components/general/UserGate";
import { PostEditLinkResource } from "@/domains/posts/dto/postResources";
import { StrictResource } from "@/core/resource";
import Link from "@/components/general/Link";

type PostEditLinkProps<T extends PostEditLinkResource> = {
  post: StrictResource<T, PostEditLinkResource>
}

export default function PostEditLink<T extends PostEditLinkResource>({ post }: PostEditLinkProps<T>) {
  return <UserGate
    auth={user => user.id === post.userId ? <Link href={`/office/posts/${post.id}`}>В кабинете</Link> : null}
  />
}
