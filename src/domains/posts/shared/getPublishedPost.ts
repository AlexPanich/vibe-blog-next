import 'server-only';
import { getPost } from "@/domains/posts/shared/getPost";
import { notFound } from "next/navigation";
import { cache } from "react";

/*
  Пост для публичной части: всё, кроме published, — 404
*/
export const getPublishedPost = cache(
  async (id: number) => {
    const post = await getPost(id);

    if(post.status !== 'published'){
      return notFound();
    }

    return post;
  }
)
