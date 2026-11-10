import { db } from "@/globals/db";
import { postTags, posts, tagAliases, tags } from "@/database/schema";
import { feedUrl } from "@/domains/posts/shared/feedUrl";
import { rssResponse } from "@/domains/posts/shared/postRss";
import { eq, inArray } from "drizzle-orm";
import { notFound, permanentRedirect } from "next/navigation";

export const dynamic = 'force-dynamic';

/*
  Лента рубрики (спека 32). Старый slug слитой рубрики (спека 47) — 308 на ленту целевой
*/
export async function GET(_request: Request, { params }: RouteContext<'/tags/[slug]/rss.xml'>){
  const { slug } = await params;
  const [ tag ] = await db.select().from(tags).where(eq(tags.slug, slug));

  if(!tag){
    const [ alias ] = await db.select({ slug: tags.slug }).from(tagAliases).innerJoin(tags, eq(tags.id, tagAliases.tagId)).where(eq(tagAliases.slug, slug));

    if(alias){
      permanentRedirect(`/tags/${encodeURIComponent(alias.slug)}/rss.xml`);
    }

    notFound();
  }

  return rssResponse({
    key: `tag:${tag.id}`,
    title: `Vibe — рубрика ${tag.name}`,
    link: feedUrl({ tag: [ tag.slug ] }),
    selfPath: `/tags/${encodeURIComponent(tag.slug)}/rss.xml`,
    description: `Посты рубрики «${tag.name}» в блоге Vibe`,
    where: inArray(posts.id, db.select({ id: postTags.postId }).from(postTags).where(eq(postTags.tagId, tag.id)))
  });
}
