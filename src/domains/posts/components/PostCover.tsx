import { imageUrl } from "@/core/imageUrl";
import type { PostResource } from "@/domains/posts/dto/postResources";

// Обложка в карточке поста: вариант 800, кадрируется стилем.
export default function PostCover({ cover }: { cover: NonNullable<PostResource['cover']> }) {
  return (
    <img
      className="ui-post-card__img"
      src={imageUrl(cover.fileKey, 800)}
      width={cover.width}
      height={cover.height}
      alt=""
      loading="lazy"
    />
  );
}
