import { imageUrl } from "@/core/imageUrl";
import type { PostResource } from "@/domains/posts/dto/postResources";

// Обложка в карточке ленты: вариант 800, кадрируется стилем.
export default function PostCover({ cover }: { cover: NonNullable<PostResource['cover']> }) {
  return (
    <img
      className="ui-card__cover"
      src={imageUrl(cover.fileKey, 800)}
      width={cover.width}
      height={cover.height}
      alt=""
      loading="lazy"
    />
  );
}
