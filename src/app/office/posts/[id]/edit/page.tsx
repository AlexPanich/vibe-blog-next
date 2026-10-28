import { CONTAINER } from "@/globals/container";
import { workWithPost } from "@/domains/posts/policy";
import Link from "next/link";
import PostEditForm from "@/domains/posts/components/PostEditForm";
import PostGalleryManager from "@/domains/posts/components/PostGalleryManager";
import { getPostImages } from "@/domains/posts/shared/postImages";
import { resource } from "@/core/resource";
import { postOfficeResource } from "@/domains/posts/dto/postResources";
import { getPost } from "@/domains/posts/shared/getPost";
import { getTagOptions } from "@/domains/posts/shared/getTagOptions";
import { tagListResource } from "@/domains/tags/exports/tagResources";
import { postGalleryResource } from "@/domains/posts/dto/postResources";
import { db } from "@/globals/db";
import { postTags } from "@/database/schema";
import { eq } from "drizzle-orm";
import { idOrFail } from "@/shared/params";
import { IconArrowLeft } from "@tabler/icons-react";
import { redirect } from "next/navigation";

export default async function OfficePostsItem({ params }: PageProps<'/office/posts/[id]/edit'>) {
  const post = await getPost(idOrFail((await params).id));
  await CONTAINER.boucerService.breakIfCant(u => workWithPost(u, post))

  // Редактируется только черновик, на странице поста видно, что делать дальше
  if(post.status !== 'draft'){
    return redirect(`/office/posts/${post.id}`);
  }

  const [ tags, images ] = await Promise.all([ getTagOptions(), getPostImages(post.id) ]);
  const tagIds = (await db.select({ tagId: postTags.tagId }).from(postTags).where(eq(postTags.postId, post.id))).map(pt => pt.tagId);

  return (
    <>
      <Link href={`/office/posts/${post.id}`} className="ui-backlink">
        <IconArrowLeft size={15} />К посту
      </Link>

      <section className="ui-panel ui-panel--form">
        <div className="ui-panel__head">
          <p className="ui-kicker">Редактирование</p>
          <h1 className="ui-panel__title">{ post.title }</h1>
        </div>
        <PostEditForm post={resource(postOfficeResource, { ...post, tagIds })} tags={resource(tagListResource, tags)} />
      </section>

      <section className="ui-panel ui-panel--form">
        <div className="ui-panel__head">
          <p className="ui-kicker">Галерея</p>
          <h2 className="ui-panel__title">Картинки</h2>
        </div>
        <PostGalleryManager postId={post.id} coverImageId={post.coverImageId} images={resource(postGalleryResource, images)} />
      </section>
    </>
  );
}
