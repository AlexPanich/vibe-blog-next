import Link from "@/components/general/Link";
import LocalDate from "@/components/general/LocalDate";
import { notFound } from "next/navigation";
import { getPublishedPost } from "@/domains/posts/shared/getPublishedPost";
import { getPostImages } from "@/domains/posts/shared/postImages";
import PostPhotoStage from "@/domains/posts/components/PostPhotoStage";
import ShareButton from "@/domains/posts/components/ShareButton";
import { getAuthor } from "@/domains/users/shared/getAuthor";
import CommentsBlock from "@/domains/comments/exports/CommentsBlock";
import { commentListResource, loadComments } from "@/domains/comments/exports/loadComments";
import { commentsCountLabel } from "@/domains/comments/shared/commentTree";
import { imageUrl } from "@/core/imageUrl";
import { resource } from "@/core/resource";
import { idOrFail } from "@/shared/params";
import { IconArrowLeft, IconChevronLeft, IconChevronRight, IconMessageCircle, IconX } from "@tabler/icons-react";

export async function generateMetadata({ params }: PageProps<'/posts/[id]/images/[imageId]'>) {
  const { post, image, index } = await load(params);
  const title = image.caption || `Фото ${index + 1} — ${post.title}`;

  return { title, openGraph: { title, images: [ imageUrl(image.fileKey, 1600) ] } };
}

const STRIP_SIZE = 6;

/*
  Просмотр фото галереи (спека 30): сцена со стрелками, подпись, лента всех миниатюр и
  комментарии к фото. Листание клавишами и свайпом — PostPhotoStage
*/
export default async function PostImagePage({ params }: PageProps<'/posts/[id]/images/[imageId]'>) {
  const { post, image, index, images } = await load(params);
  const [ comments, author ] = await Promise.all([ loadComments(post.id, image.id), getAuthor(post.userId) ]);
  const postHref = `/posts/${post.id}` as const;
  const photoHref = (id: number) => `/posts/${post.id}/images/${id}` as const;
  const prev = images[index - 1];
  const next = images[index + 1];
  const alt = image.caption || `${post.title}, фото ${index + 1}`;
  const strip = stripWindow(images.length, index);

  return (
    <article className="ui-photo">
      <div className="ui-photo__bar">
        <Link href={postHref} className="ui-photo__back">
          <span className="ui-photo__back-icon"><IconArrowLeft size={18} stroke={2} /></span>
          <span className="ui-photo__back-text">
            <span className="ui-photo__back-label">К истории</span>
            <span className="ui-photo__back-title">{ post.title }</span>
          </span>
        </Link>
        <p className="ui-photo__counter" aria-label={`Фото ${index + 1} из ${images.length}`}>
          <b>{ index + 1 }</b> / { images.length }<span className="ui-photo__counter-unit"> фото</span>
        </p>
        <div className="ui-photo__tools">
          <ShareButton title={post.title} withLabel />
          <Link href={postHref} className="ui-pill ui-pill--icon" aria-label="Закрыть" title="Закрыть"><IconX size={18} stroke={1.8} /></Link>
        </div>
      </div>

      <PostPhotoStage postId={post.id} prevId={prev?.id ?? null} nextId={next?.id ?? null}>
        { prev
          ? <Link href={photoHref(prev.id)} scroll={false} className="ui-photo__arrow" aria-label="Предыдущее фото"><IconChevronLeft size={22} stroke={2} /></Link>
          : <span className="ui-photo__arrow" aria-hidden /> }

        <figure className="ui-photo__figure">
          <img
            key={image.id}
            src={imageUrl(image.fileKey, 1600)}
            srcSet={`${imageUrl(image.fileKey, 800)} 800w, ${imageUrl(image.fileKey, 1600)} 1600w`}
            sizes="(max-width: 80rem) 100vw, 80rem"
            width={image.width}
            height={image.height}
            alt={alt}
          />
          { images.length > 1 && <span className="ui-photo__dots" aria-hidden>
            { images.map((item, i) => <i key={item.id} data-active={i === index || undefined} />) }
          </span> }
        </figure>

        { next
          ? <Link href={photoHref(next.id)} scroll={false} className="ui-photo__arrow ui-photo__arrow--next" aria-label="Следующее фото"><IconChevronRight size={22} stroke={2} /></Link>
          : <span className="ui-photo__arrow ui-photo__arrow--next" aria-hidden /> }
      </PostPhotoStage>

      <div className="ui-photo__info">
        <div className="ui-photo__caption">
          { image.caption && <p className="ui-photo__text">{ image.caption }</p> }
          <div className="ui-photo__meta">
            <a href="#comments" className="ui-photo__comments-link">
              <IconMessageCircle size={16} stroke={1.8} />
              { image.commentsCount > 0 ? commentsCountLabel(image.commentsCount) : 'Комментировать' }
            </a>
            <span className="ui-photo__byline">
              { author.name } · <LocalDate value={post.publishedAt ?? post.createdAt} options={{ dateStyle: 'long' }} />
            </span>
            <ShareButton title={post.title} className="ui-photo__share" />
          </div>
        </div>
        { images.length > 1 && <p className="ui-photo__keys" aria-hidden><kbd>←</kbd><kbd>→</kbd>листать</p> }
      </div>

      { images.length > 1 && <nav className="ui-photo__strip" aria-label="Все фото поста">
        { images.slice(strip.start, strip.end).map((item, i) => {
          const at = strip.start + i;
          const more = at === strip.end - 1 ? strip.more : 0;

          return <Link
            key={item.id}
            href={photoHref(item.id)}
            scroll={false}
            className="ui-photo__thumb"
            aria-current={at === index ? 'page' : undefined}
            aria-label={more > 0 ? `Фото ${at + 1} и ещё ${more - 1}` : `Фото ${at + 1}`}
            data-more={more > 0 || undefined}
          >
            <img src={imageUrl(item.fileKey, 400)} width={item.width} height={item.height} alt="" loading="lazy" />
            { more > 0 && <span className="ui-photo__more" aria-hidden>+{ more }</span> }
          </Link>;
        }) }
      </nav> }

      <div id="comments" className="ui-photo__comments">
        <CommentsBlock postId={post.id} imageId={image.id} postAuthorId={post.userId} title="Комментарии к фото" comments={resource(commentListResource, comments)} />
      </div>
    </article>
  );
}

/*
  Лента миниатюр (как в макете): до STRIP_SIZE штук, текущая — третьей, пока есть куда
  сдвигать. Если справа остались фото, на последней миниатюре — «+N»: N — она сама и
  всё, что за ней. Текущая на плашку не попадает: она не дальше третьей в окне
*/
function stripWindow(count: number, index: number){
  if(count <= STRIP_SIZE){
    return { start: 0, end: count, more: 0 };
  }

  const start = Math.min(Math.max(index - 2, 0), count - STRIP_SIZE);
  const end = start + STRIP_SIZE;

  return { start, end, more: end < count ? count - end + 1 : 0 };
}

// Картинка только своего опубликованного поста: чужой id или черновик — 404
async function load(params: PageProps<'/posts/[id]/images/[imageId]'>['params']){
  const { id, imageId } = await params;
  const post = await getPublishedPost(idOrFail(id));
  const images = await getPostImages(post.id);
  const index = images.findIndex(i => i.id === idOrFail(imageId));

  if(index === -1){
    return notFound();
  }

  return { post, images, index, image: images[index] };
}
