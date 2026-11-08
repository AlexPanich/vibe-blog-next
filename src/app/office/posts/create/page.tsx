import { CONTAINER } from "@/globals/container";
import { createPost } from "@/domains/posts/policy";
import OfficeCrumbs from "@/components/layout/OfficeCrumbs";
import PostEditorForm from "@/domains/posts/components/editor/PostEditorForm";
import PostCoverField from "@/domains/posts/components/editor/PostCoverField";
import PostPhotosCard from "@/domains/posts/components/editor/PostPhotosCard";
import { getTagOptions } from "@/domains/posts/shared/getTagOptions";
import { tagListResource } from "@/domains/tags/exports/tagResources";
import { resource } from "@/core/resource";

export const metadata = { title: 'Новый пост' };

// Новый пост (спека 42, шаг 4): тот же редактор, что у черновика; фото — после первого сохранения
export default async function OfficePostsCreate() {
  await CONTAINER.boucerService.breakIfCant(createPost);
  const tags = await getTagOptions();

  return (
    <PostEditorForm
      tags={resource(tagListResource, tags)}
      head={<>
        <OfficeCrumbs items={[ { label: 'Мои посты', href: '/office/posts' }, { label: 'Новый пост' } ]} />
        <h1 className="ui-title">О чём расскажешь?</h1>
      </>}
      cover={<PostCoverField cover={null} />}
      photos={<PostPhotosCard anchor="photos" />}
    />
  );
}
