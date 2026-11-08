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

// Сколько фото в мозаике публичной страницы; остальные — за плашкой «+N» на последнем
const MOSAIC_SIZE = 3;

/*
  Галерея поста. В кабинете — сетка всех превью; на публичной странице (linked) — мозаика
  из первых фото (спека 30), остальные листаются на странице картинки. Без 'use client' —
  рендерят серверные страницы
*/
export default function PostGallery({ postId, title, images, linked = false }: PostGalleryProps) {
  if(images.length === 0){
    return null;
  }

  const shown = linked ? images.slice(0, MOSAIC_SIZE) : images;
  const rest = images.length - shown.length;

  return (
    <div className={linked ? 'ui-gallery ui-gallery--mosaic' : 'ui-gallery'} data-count={linked ? shown.length : undefined}>
      { shown.map((image, index) => {
        const picture = <>
          <img
            src={imageUrl(image.fileKey, linked ? 800 : 400)}
            width={image.width}
            height={image.height}
            alt={image.caption || `${title}, фото ${index + 1}`}
            loading="lazy"
          />
          { rest > 0 && index === shown.length - 1 && <span className="ui-gallery__more">+{ rest } фото</span> }
          { image.commentsCount > 0 && <span className="ui-gallery__count"><IconMessage size={12} stroke={2} />{ image.commentsCount }</span> }
        </>;

        return linked
          ? <Link key={image.id} href={`/posts/${postId}/images/${image.id}`} className="ui-gallery__item">{ picture }</Link>
          : <span key={image.id} className="ui-gallery__item">{ picture }</span>
      }) }
    </div>
  );
}
