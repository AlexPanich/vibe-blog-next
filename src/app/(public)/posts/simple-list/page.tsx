import { db } from "@/globals/db";
import { posts as postsTable } from "@/database/schema";
import { desc, eq } from "drizzle-orm";
import PostCardBridge from "@/domains/posts/components/PostCardBridge";
import { resource } from "@/core/resource";
import { postResource } from "@/domains/posts/dto/postResources";
import { pickTags, POST_TAGS_WITH } from "@/domains/posts/shared/postTags";
import { withRatings } from "@/domains/posts/shared/postRatings";
import { withCovers } from "@/domains/posts/shared/postImages";

export const dynamic = 'force-dynamic';

export default async function Authros() {
  const posts = await withCovers(await withRatings(await db.query.posts.findMany({
    where: eq(postsTable.status, 'published'),
    orderBy: desc(postsTable.createdAt),
    with: { author: true, ...POST_TAGS_WITH }
  })));

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title ui-title--lg">Блог</h1>
      </div>
      <div className="ui-grid">
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
