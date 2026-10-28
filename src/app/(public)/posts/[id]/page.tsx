import Link from "@/components/general/Link";
import PostMarkdown from "@/domains/posts/components/PostMarkdown";
import PostModerateLink from "@/domains/posts/components/PostModerateLink";
import { getPostTags } from "@/domains/posts/shared/getPostTags";
import TagChips from "@/domains/tags/exports/TagChips";
import PostRatingBlock from "@/domains/posts/components/PostRatingBlock";
import PostFavoriteButton from "@/domains/posts/components/PostFavoriteButton";
import PostTypeMeta from "@/domains/posts/components/PostTypeMeta";
import PostGallery from "@/domains/posts/components/PostGallery";
import { getPostImages } from "@/domains/posts/shared/postImages";
import PostLocationMap from "@/domains/posts/components/map/PostLocationMap";
import { postRatingStats } from "@/domains/posts/shared/postRatings";
import { postRatingBlockResource } from "@/domains/posts/dto/postResources";
import { resource } from "@/core/resource";
import CommentsBlock from "@/domains/comments/exports/CommentsBlock";
import { commentListResource, loadComments } from "@/domains/comments/exports/loadComments";
import { getPublishedPost } from "@/domains/posts/shared/getPublishedPost";
import { idOrFail } from "@/shared/params";
import { stripMarkdown } from "@/core/markdown";
import LocalDate from "@/components/general/LocalDate";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import UserFollowButton from "@/domains/users/exports/UserFollowButton";
import { getAuthor } from "@/domains/users/shared/getAuthor";
import { IconArrowLeft, IconCalendar } from "@tabler/icons-react";

export async function generateMetadata({ params }: PageProps<'/posts/[id]'>) {
  const post = await getPublishedPost(idOrFail((await params).id));
  const description = stripMarkdown(post.content).slice(0, 160);

  return { title: post.title, description, openGraph: { title: post.title, description, type: 'article' } }
}

export default async function OfficePostsItem({ params }: PageProps<'/posts/[id]'>) {
  const post = await getPublishedPost(idOrFail((await params).id));
  const [ tags, rating, comments, images, author ] = await Promise.all([ getPostTags(post.id), postRatingStats(post.id), loadComments(post.id, null), getPostImages(post.id), getAuthor(post.userId) ]);

  return (
    <article className="ui-article">
      <Link href="/posts" className="ui-backlink">
        <IconArrowLeft size={15} />В блог
      </Link>

      <h1 className="ui-title ui-title--lg">{ post.title }</h1>

      <div className="ui-meta">
        <Link href={`/authors/${author.id}`} className="ui-meta__item">
          <UserAvatar name={author.name} avatarKey={author.avatarKey} size={20} />{ author.name }
        </Link>
        <span className="ui-meta__item">
          <IconCalendar size={14} stroke={1.8} />
          <LocalDate value={post.publishedAt ?? post.createdAt} options={{ dateStyle: 'long' }} />
        </span>
        <PostTypeMeta post={post} />
        <TagChips tags={tags} linked />
        <PostModerateLink id={post.id} />
      </div>

      { post.type === 'travel' && post.lat !== null && post.lng !== null && <PostLocationMap lat={post.lat} lng={post.lng} /> }

      <div className="ui-article__body"><PostMarkdown content={post.content} /></div>

      <PostGallery postId={post.id} title={post.title} images={images} linked />

      <div className="ui-actions">
        <PostRatingBlock post={resource(postRatingBlockResource, { ...post, rating })} />
        <PostFavoriteButton id={post.id} />
        <UserFollowButton authorId={author.id} authorName={author.name} />
      </div>

      <CommentsBlock postId={post.id} postAuthorId={post.userId} comments={resource(commentListResource, comments)} />
    </article>
  );
}
