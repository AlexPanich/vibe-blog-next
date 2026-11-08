import { db } from "@/globals/db";
import { posts as postsTable } from "@/database/schema";
import { desc, eq } from "drizzle-orm";
import PostCardBridge from "@/domains/posts/components/PostCardBridge";
import { resource } from "@/core/resource";
import { postResource } from "@/domains/posts/dto/postResources";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withCardData } from "@/domains/posts/shared/postCards";

export const dynamic = 'force-dynamic';

export default async function Authros() {
  const posts = await withCardData(await db.query.posts.findMany({
    where: eq(postsTable.status, 'published'),
    orderBy: desc(postsTable.createdAt),
    with: { author: true, ...POST_TAGS_WITH }
  }));

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title ui-title--lg">Блог</h1>
      </div>
      <div className="ui-post-grid">
        { posts.map(post => {
          return <PostCardBridge
            key={post.id}
            post={resource(postResource, { ...post, tags: pickTags(post) })}
          />
        }) }
      </div>
    </>
  );
}
