import { posts } from "@/database/schema";
import { getAuthor } from "@/domains/users/shared/getAuthor";
import { rssResponse } from "@/domains/posts/shared/postRss";
import { idOrFail } from "@/shared/params";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

// Пользователь без опубликованных постов — пустой канал, не 404
export async function GET(_request: Request, { params }: RouteContext<'/authors/[id]/rss.xml'>){
  const author = await getAuthor(idOrFail((await params).id));

  return rssResponse({
    key: `author:${author.id}`,
    title: `Vibe — ${author.name}`,
    link: `/authors/${author.id}`,
    selfPath: `/authors/${author.id}/rss.xml`,
    description: author.bio ?? `Посты автора ${author.name} в блоге Vibe`,
    where: eq(posts.userId, author.id)
  });
}
