import { imageUrl } from "@/core/imageUrl";
import type { PostGalleryResource } from "@/domains/posts/dto/postResources";
import { IconMessage } from "@tabler/icons-react";
import Link from "@/components/general/Link";

type PostGalleryProps = {
  postId: number,
  title: string,
  images: PostGalleryResource,
  // Ссылки на страницы картинок — только у опубликованного поста; в кабинете и модерации без них
  linked?: boolean
}

// Галерея поста: сетка превью. Без 'use client' — рендерят серверные страницы.
export default function PostGallery({ postId, title, images, linked = false }: PostGalleryProps) {
  if(images.length === 0){
    return null;
  }

  return (
    <div className="ui-gallery">
      { images.map((image, index) => {
        const picture = <>
          <img
            src={imageUrl(image.fileKey, 400)}
            width={image.width}
            height={image.height}
            alt={image.caption || `${title}, фото ${index + 1}`}
            loading="lazy"
          />
          { image.commentsCount > 0 && <span className="ui-gallery__count"><IconMessage size={12} stroke={2} />{ image.commentsCount }</span> }
        </>;

        return linked
          ? <Link key={image.id} href={`/posts/${postId}/images/${image.id}`} className="ui-gallery__item">{ picture }</Link>
          : <span key={image.id} className="ui-gallery__item">{ picture }</span>
      }) }
    </div>
  );
}
