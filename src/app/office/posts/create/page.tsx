import { CONTAINER } from "@/globals/container";
import { createPost } from "@/domains/posts/policy";
import PostCreateForm from "@/domains/posts/components/PostCreateForm";
import { getTagOptions } from "@/domains/posts/shared/getTagOptions";
import { tagListResource } from "@/domains/tags/exports/tagResources";
import { resource } from "@/core/resource";

export const metadata = { title: 'Новый пост' };

export default async function OfficePostsCreate() {
  await CONTAINER.boucerService.breakIfCant(createPost);
  const tags = await getTagOptions();

  return (
    <section className="ui-panel ui-panel--form">
      <div className="ui-panel__head">
        <p className="ui-kicker">Новый пост</p>
        <h1 className="ui-panel__title">О чём расскажешь?</h1>
      </div>
      <PostCreateForm tags={resource(tagListResource, tags)} />
      <p className="ui-note">Картинки добавляются после создания черновика — на странице редактирования.</p>
    </section>
  );
}
