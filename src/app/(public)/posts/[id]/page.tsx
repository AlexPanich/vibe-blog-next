import PostMarkdown from "@/domains/posts/components/PostMarkdown";
import PostHead from "@/domains/posts/components/PostHead";
import PostActions from "@/domains/posts/components/PostActions";
import { getPostTags } from "@/domains/posts/shared/getPostTags";
import TagChips from "@/domains/tags/exports/TagChips";
import PostRatingBlock from "@/domains/posts/components/PostRatingBlock";
import PostGallery from "@/domains/posts/components/PostGallery";
import PostCardBridge from "@/domains/posts/components/PostCardBridge";
import { coverOf, getPostImages } from "@/domains/posts/shared/postImages";
import PostLocationMap from "@/domains/posts/components/map/PostLocationMap";
import { postRatingStats } from "@/domains/posts/shared/postRatings";
import { readingMinutes } from "@/domains/posts/shared/postText";
import { authorMorePosts } from "@/domains/posts/shared/authorMorePosts";
import { postRatingBlockResource, postResource } from "@/domains/posts/dto/postResources";
import { resource } from "@/core/resource";
import { imageUrl } from "@/core/imageUrl";
import CommentsBlock from "@/domains/comments/exports/CommentsBlock";
import { commentListResource, loadComments } from "@/domains/comments/exports/loadComments";
import { getPublishedPost } from "@/domains/posts/shared/getPublishedPost";
import { idOrFail } from "@/shared/params";
import { stripMarkdown } from "@/core/markdown";
import Link from "@/components/general/Link";
import { getAuthor } from "@/domains/users/shared/getAuthor";
import { IconArrowLeft } from "@tabler/icons-react";

export async function generateMetadata({ params }: PageProps<'/posts/[id]'>) {
  const post = await getPublishedPost(idOrFail((await params).id));
  const description = stripMarkdown(post.content).slice(0, 160);

  return { title: post.title, description, openGraph: { title: post.title, description, type: 'article' } }
}

export default async function PostPage({ params }: PageProps<'/posts/[id]'>) {
  const post = await getPublishedPost(idOrFail((await params).id));
  const [ tags, rating, comments, images, author, more ] = await Promise.all([
    getPostTags(post.id),
    postRatingStats(post.id),
    loadComments(post.id, null),
    getPostImages(post.id),
    getAuthor(post.userId),
    authorMorePosts(post.userId, post.id)
  ]);
  const cover = coverOf(post, images);

  return <>
    <article className="ui-post">
      <PostHead post={post} author={author} rubric={tags[0]} readingMinutes={readingMinutes(post.content)} />

      { cover && <figure className="ui-post__cover">
        <img
          src={imageUrl(cover.fileKey, 1600)}
          srcSet={`${imageUrl(cover.fileKey, 800)} 800w, ${imageUrl(cover.fileKey, 1600)} 1600w`}
          sizes="(max-width: 80rem) 100vw, 80rem"
          width={cover.width}
          height={cover.height}
          alt=""
          fetchPriority="high"
        />
        <Link href="/posts" className="ui-post__back" aria-label="В ленту"><IconArrowLeft size={18} stroke={2} /></Link>
      </figure> }

      <div className="ui-post__body">
        <PostMarkdown content={post.content} />
      </div>

      <div className="ui-post__wide">
        <PostGallery postId={post.id} title={post.title} images={images} linked />
      </div>

      <div className="ui-post__column">
        { post.type === 'travel' && post.lat !== null && post.lng !== null && <PostLocationMap lat={post.lat} lng={post.lng} /> }
        { tags.length > 1 && <TagChips tags={tags} linked /> }

        <div className="ui-post__reactions">
          <PostRatingBlock post={resource(postRatingBlockResource, { ...post, rating })} />
          <PostActions id={post.id} title={post.title} />
        </div>

        <CommentsBlock postId={post.id} postAuthorId={post.userId} comments={resource(commentListResource, comments)} />
      </div>
    </article>

    { more.length > 0 && <section className="ui-post-more">
      <h2 className="ui-post-more__title">Ещё у автора</h2>
      <div className="ui-post-grid">
        { more.map(card => <PostCardBridge key={card.id} post={resource(postResource, card)} />) }
      </div>
    </section> }
  </>
}
