import { StrictResource } from "@/core/resource";
import { imageUrl } from "@/core/imageUrl";
import { uploadsConfig } from "@/config/uploads";
import type { PostGalleryResource } from "@/domains/posts/dto/postResources";
import { IconPlus } from "@tabler/icons-react";

type PostPhotosCardProps<T extends PostGalleryResource> = {
  // Нет — пост ещё не сохранён
  images?: StrictResource<T, PostGalleryResource>,
  // id блока с галереей под формой: туда ведут превью и «+»
  anchor: string
}

const SHOWN = 3;

/*
  «Фото к посту» в колонке редактора (спека 42) — сводка галереи: три превью и «+». Подписи,
  обложка и удаление — в полной галерее под формой, карточка ведёт к ней якорем
*/
export default function PostPhotosCard<T extends PostGalleryResource>({ images, anchor }: PostPhotosCardProps<T>) {
  const rest = images ? images.length - SHOWN : 0;

  return (
    <section className="ui-photos-card">
      <div className="ui-photos-card__head">
        <h2>Фото к посту</h2>
        { images && <span>{ images.length } из { uploadsConfig.postImagesPerPost }</span> }
      </div>

      { images ? (
        <div className="ui-photos-card__thumbs">
          { images.slice(0, SHOWN).map(image => (
            <a key={image.id} href={`#${anchor}`} className="ui-photos-card__thumb">
              <img src={imageUrl(image.fileKey, 400)} alt={image.caption ?? ''} />
            </a>
          )) }
          <a href={`#${anchor}`} className="ui-photos-card__add" aria-label="Все фото поста">
            { rest > 0 ? `+${rest}` : <IconPlus size={18} stroke={1.8} /> }
          </a>
        </div>
      ) : (
        <p className="ui-photos-card__note">Фото добавляются к сохранённому черновику — после первого «Сохранить».</p>
      ) }
    </section>
  );
}
