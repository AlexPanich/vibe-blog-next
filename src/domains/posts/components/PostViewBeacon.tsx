'use client'

import 'client-only';
import { recordPostViewAction } from "@/domains/posts/actions/postViewActions";
import { useEffect, useRef } from "react";

type PostViewBeaconProps = {
  postId: number
}

// Засчитывает просмотр поста один раз после гидрации (спека 43): prefetch и кэш страницы не накручивают
export default function PostViewBeacon({ postId }: PostViewBeaconProps) {
  const sentFor = useRef<number | null>(null);

  useEffect(() => {
    if(sentFor.current !== postId){
      sentFor.current = postId;
      recordPostViewAction(postId).catch(() => {});
    }
  }, [ postId ]);

  return null;
}
