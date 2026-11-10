import ReactMarkdown, { defaultUrlTransform, type Components, type UrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { imageUrl } from "@/core/imageUrl";
import Link from "@/components/general/Link";
import type { PostGalleryResource } from "@/domains/posts/dto/postResources";
import { galleryImageId, GALLERY_SRC, remarkGalleryPhotos } from "@/domains/posts/shared/postGalleryRefs";

type PostMarkdownPhotos = {
  postId: number,
  images: PostGalleryResource,
  // ссылка на страницу фото — только у опубликованного поста, как у мозаики
  linked?: boolean
}

/*
  Текст поста. Без 'use client': рендерит и серверная страница поста, и предпросмотр в форме —
  вид совпадает. Сырой HTML пропускается, картинки — только фото галереи поста (спека 38), опасные
  протоколы ссылок режет urlTransform. Без photos фото в тексте не выводятся
*/
export default function PostMarkdown({ content, photos }: { content: string, photos?: PostMarkdownPhotos }) {
  return (
    <div className="ui-prose">
      <ReactMarkdown remarkPlugins={[ remarkGfm, remarkGalleryPhotos ]} skipHtml urlTransform={urlTransform} components={components(photos)}>
        { content }
      </ReactMarkdown>
    </div>
  );
}

// h1 на странице — заголовок поста, поэтому заголовки текста на уровень ниже
const HEADINGS: Components = {
  h1: ({ children }) => <h2>{ children }</h2>,
  h2: ({ children }) => <h3>{ children }</h3>,
  h3: ({ children }) => <h4>{ children }</h4>,
  h4: ({ children }) => <h5>{ children }</h5>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer nofollow">{ children }</a>,
};

function components(photos?: PostMarkdownPhotos): Components {
  return {
    ...HEADINGS,
    img: ({ src }) => {
      const id = typeof src === 'string' ? galleryImageId(src) : null;
      const image = id === null ? undefined : photos?.images.find(i => i.id === id);

      if(!photos || !image){
        return null;
      }

      const picture = (
        <img
          src={imageUrl(image.fileKey, 1600)}
          srcSet={`${imageUrl(image.fileKey, 800)} 800w, ${imageUrl(image.fileKey, 1600)} 1600w`}
          sizes="(max-width: 42.5rem) 100vw, 42.5rem"
          width={image.width}
          height={image.height}
          alt={image.caption ?? ''}
          loading="lazy"
        />
      );

      return (
        <figure className="ui-post-photo">
          { photos.linked
            ? <Link href={`/posts/${photos.postId}/images/${image.id}`} className="ui-post-photo__link">{ picture }</Link>
            : picture }
          { image.caption && <figcaption>{ image.caption }</figcaption> }
        </figure>
      );
    }
  };
}

// Штатный urlTransform вычищает неизвестную схему gallery: — её пропускаем только в src
const urlTransform: UrlTransform = (url, key) => key === 'src' && GALLERY_SRC.test(url) ? url : defaultUrlTransform(url);
