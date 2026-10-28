'use client'

import 'client-only';
import { PostResource } from "@/domains/posts/dto/postResources";
import { StrictResource } from "@/core/resource";
import PostCard from "@/domains/posts/components/PostCard";

type PostCardBridgeProps<T extends PostResource> = { 
  post: StrictResource<T, PostResource>
}

export default function PostCardBridge<T extends PostResource>({ post }: PostCardBridgeProps<T>) {
  return <PostCard post={post} />
}
