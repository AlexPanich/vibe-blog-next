import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPost } from "@/domains/posts/shared/getPublishedPost";
import { getPostImages } from "@/domains/posts/shared/postImages";
import CommentsBlock from "@/domains/comments/exports/CommentsBlock";
import { commentListResource, loadComments } from "@/domains/comments/exports/loadComments";
import { imageUrl } from "@/core/imageUrl";
import { resource } from "@/core/resource";
import { idOrFail } from "@/shared/params";
import { IconArrowLeft, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export async function generateMetadata({ params }: PageProps<'/posts/[id]/images/[imageId]'>) {
  const { post, image, index } = await load(params);
  const title = image.caption || `Фото ${index + 1} — ${post.title}`;

  return { title, openGraph: { title, images: [ imageUrl(image.fileKey, 1600) ] } };
}

export default async function PostImagePage({ params }: PageProps<'/posts/[id]/images/[imageId]'>) {
  const { post, image, index, images } = await load(params);
  const comments = await loadComments(post.id, image.id);
  const prev = images[index - 1];
  const next = images[index + 1];
  const alt = image.caption || `${post.title}, фото ${index + 1}`;

  return (
    <article className="ui-article ui-photo">
      <Link href={`/posts/${post.id}`} className="ui-backlink">
        <IconArrowLeft size={15} />{ post.title }
      </Link>

      <figure className="ui-photo__figure">
        <img
          src={imageUrl(image.fileKey, 1600)}
          srcSet={`${imageUrl(image.fileKey, 800)} 800w, ${imageUrl(image.fileKey, 1600)} 1600w`}
          sizes="(max-width: 52rem) 100vw, 52rem"
          width={image.width}
          height={image.height}
          alt={alt}
        />
        { image.caption && <figcaption>{ image.caption }</figcaption> }
      </figure>

      <nav className="ui-photo__nav" aria-label="Другие фото">
        { prev
          ? <Link href={`/posts/${post.id}/images/${prev.id}`}><IconChevronLeft size={16} />Предыдущая</Link>
          : <span /> }
        <span className="ui-meta">{ index + 1 } из { images.length }</span>
        { next
          ? <Link href={`/posts/${post.id}/images/${next.id}`}>Следующая<IconChevronRight size={16} /></Link>
          : <span /> }
      </nav>

      <CommentsBlock postId={post.id} imageId={image.id} postAuthorId={post.userId} comments={resource(commentListResource, comments)} />
    </article>
  );
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
