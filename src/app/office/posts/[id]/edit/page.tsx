import { CONTAINER } from "@/globals/container";
import { workWithPost } from "@/domains/posts/policy";
import OfficeCrumbs from "@/components/layout/OfficeCrumbs";
import PostEditorForm from "@/domains/posts/components/editor/PostEditorForm";
import PostCoverField from "@/domains/posts/components/editor/PostCoverField";
import PostPhotosCard from "@/domains/posts/components/editor/PostPhotosCard";
import PostGalleryManager from "@/domains/posts/components/PostGalleryManager";
import { getPostImages } from "@/domains/posts/shared/postImages";
import { resource } from "@/core/resource";
import { postCoverResource, postGalleryResource, postOfficeResource } from "@/domains/posts/dto/postResources";
import { getPost } from "@/domains/posts/shared/getPost";
import { getTagOptions } from "@/domains/posts/shared/getTagOptions";
import { tagListResource } from "@/domains/tags/exports/tagResources";
import { uploadsConfig } from "@/config/uploads";
import { db } from "@/globals/db";
import { postTags } from "@/database/schema";
import { eq } from "drizzle-orm";
import { idOrFail } from "@/shared/params";
import { redirect } from "next/navigation";
import type { Route } from "next";

export async function generateMetadata({ params }: PageProps<'/office/posts/[id]/edit'>) {
  const post = await getPost(idOrFail((await params).id));

  return { title: `Правка: ${post.title}` };
}

/*
  Редактор черновика (спека 42, шаг 4). Под формой — полная галерея: подписи, выбор обложки,
  удаление; карточка «Фото к посту» справа ведёт к ней
*/
export default async function OfficePostsEdit({ params }: PageProps<'/office/posts/[id]/edit'>) {
  const post = await getPost(idOrFail((await params).id));
  await CONTAINER.boucerService.breakIfCant(u => workWithPost(u, post))

  // Редактируется только черновик, на странице поста видно, что делать дальше
  if(post.status !== 'draft'){
    return redirect(`/office/posts/${post.id}`);
  }

  const [ tags, images ] = await Promise.all([ getTagOptions(), getPostImages(post.id) ]);
  const tagIds = (await db.select({ tagId: postTags.tagId }).from(postTags).where(eq(postTags.postId, post.id))).map(pt => pt.tagId);
  const cover = images.find(image => image.id === post.coverImageId) ?? images[0] ?? null;

  return (
    <>
      <PostEditorForm
        post={resource(postOfficeResource, { ...post, tagIds })}
        tags={resource(tagListResource, tags)}
        head={<>
          <OfficeCrumbs items={[
            { label: 'Мои посты', href: '/office/posts' },
            { label: post.title, href: `/office/posts/${post.id}` as Route },
            { label: 'Правка' }
          ]} />
          <h1 className="ui-title">Правка черновика</h1>
        </>}
        cover={<PostCoverField
          postId={post.id}
          cover={cover && resource(postCoverResource, cover)}
          full={images.length >= uploadsConfig.postImagesPerPost}
        />}
        photos={<PostPhotosCard images={resource(postGalleryResource, images)} anchor="photos" />}
      />

      <section id="photos" className="ui-post-photos">
        <div className="ui-post-photos__head">
          <h2>Фото к посту</h2>
          <p>Подписи сохраняются сразу, обложку можно выбрать из загруженных.</p>
        </div>
        <PostGalleryManager postId={post.id} coverImageId={post.coverImageId} images={resource(postGalleryResource, images)} />
      </section>
    </>
  );
}
