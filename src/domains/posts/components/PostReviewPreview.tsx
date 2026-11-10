import { routePointsResource, type PostDetailsResource, type PostGalleryResource, type RoutePointsResource } from "@/domains/posts/dto/postResources";
import PostRouteMap from "@/domains/posts/components/map/PostRouteMap";
import { routeKm } from "@/core/geo";
import { resource } from "@/core/resource";
import LocalDate from "@/components/general/LocalDate";
import PostGallery from "@/domains/posts/components/PostGallery";
import PostMarkdown from "@/domains/posts/components/PostMarkdown";
import PostStatusTag from "@/domains/posts/components/PostStatusTag";
import PostTypeMeta from "@/domains/posts/components/PostTypeMeta";
import { coverOf, inlineCover } from "@/domains/posts/shared/postImages";
import { galleryIdsInText } from "@/domains/posts/shared/postGalleryRefs";
import { readingMinutes } from "@/domains/posts/shared/postText";
import { POST_TYPE_LABELS } from "@/domains/posts/shared/postTypes";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { imageUrl } from "@/core/imageUrl";
import type { PostStatus } from "@/database/schema";
import { IconPhotoExclamation } from "@tabler/icons-react";

type PostReviewPreviewProps = {
  post: PostDetailsResource & {
    id: number,
    title: string,
    lead: string | null,
    url: string,
    content: string,
    status: PostStatus,
    createdAt: Date,
    coverImageId: number | null
  },
  author: { name: string, avatarKey: string | null },
  tags: { id: number, name: string }[],
  images: PostGalleryResource,
  // Маршрут путешествия (спека 37); у других типов — []
  points: RoutePointsResource
}

/*
  Пост на ревью так, как его увидит читатель (спека 42, шаг 14): тип и рубрики, заголовок,
  подзаголовок, автор, обложка, текст, галерея, карта маршрута. Если фото есть — напоминание проверить
  авторство. Без 'use client' — рендерит серверная страница
*/
export default function PostReviewPreview({ post, author, tags, images, points }: PostReviewPreviewProps) {
  const inline = galleryIdsInText(post.content);
  const cover = inlineCover(post, images, inline) ? null : coverOf(post, images);
  const minutes = readingMinutes(post.content);

  return (
    <article className="ui-review-post">
      <div className="ui-review-post__pills">
        { post.status !== 'moderating' && <PostStatusTag status={post.status} /> }
        { post.type !== 'simple' && <span className="ui-review-post__pill" data-tone="type">{ POST_TYPE_LABELS[post.type] }</span> }
        { tags.map(tag => <span key={tag.id} className="ui-review-post__pill">#{ tag.name }</span>) }
      </div>

      <h1 className="ui-review-post__title">{ post.title }</h1>
      { post.lead && <p className="ui-review-post__lead">{ post.lead }</p> }

      <div className="ui-review-post__author">
        <UserAvatar name={author.name} avatarKey={author.avatarKey} size={36} />
        <span>
          <b>{ author.name }</b>
          <span className="ui-review-post__meta">
            <span className="ui-review-post__desk-only">создан <LocalDate value={post.createdAt} options={{ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }} /> · </span>
            { minutes } мин чтения
            <span className="ui-review-post__desk-only"> · /{ post.url }</span>
            { tags[0] && <span className="ui-review-post__phone-only"> · #{ tags[0].name }</span> }
          </span>
          { post.type !== 'simple' && <span className="ui-review-post__links"><PostTypeMeta post={{ ...post, routeKm: routeKm(points) }} /></span> }
        </span>
      </div>

      { cover && <img
        className="ui-review-post__cover"
        src={imageUrl(cover.fileKey, 1600)}
        srcSet={`${imageUrl(cover.fileKey, 800)} 800w, ${imageUrl(cover.fileKey, 1600)} 1600w`}
        sizes="(max-width: 720px) 100vw, 640px"
        width={cover.width}
        height={cover.height}
        alt=""
      /> }

      <div className="ui-review-post__body">
        <PostMarkdown content={post.content} photos={{ postId: post.id, images }} />
      </div>

      { images.length > 0 && <p className="ui-review-post__flag">
        <IconPhotoExclamation size={16} stroke={1.8} />
        В посте { images.length } фото — проверьте, что у сторонних указан автор
      </p> }

      <PostGallery postId={post.id} title={post.title} images={images.filter(image => !inline.includes(image.id))} />

      { post.type === 'travel' && points.length > 0 && <PostRouteMap points={resource(routePointsResource, points)} travelDays={post.travelDays} /> }
    </article>
  );
}
