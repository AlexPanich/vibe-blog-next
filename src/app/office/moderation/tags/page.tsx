import { CONTAINER } from "@/globals/container";
import { db } from "@/globals/db";
import { postTags, tags as tagsTable } from "@/database/schema";
import { manageTags } from "@/domains/tags/policy";
import TagCreateForm from "@/domains/tags/components/TagCreateForm";
import TagRow from "@/domains/tags/components/TagRow";
import { tagRowResource } from "@/domains/tags/dto/tagResources";
import { sortTags } from "@/domains/tags/shared/tagNames";
import { resource } from "@/core/resource";
import { count, eq, getTableColumns } from "drizzle-orm";
import { IconTags } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Рубрики' };

export default async function ModerationTags() {
  await CONTAINER.boucerService.breakIfCant(manageTags);

  // Постов всех статусов: удаление снимет рубрику и с черновиков
  const tags = sortTags(await db.select({ ...getTableColumns(tagsTable), postsCount: count(postTags.postId) })
    .from(tagsTable)
    .leftJoin(postTags, eq(postTags.tagId, tagsTable.id))
    .groupBy(tagsTable.id));

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Рубрики</h1>
        <span className="ui-kicker">Всего: { tags.length }</span>
      </div>

      <section className="ui-panel ui-panel--form">
        <TagCreateForm />
      </section>

      { tags.length === 0 ? (
        <div className="ui-empty">
          <IconTags size={26} stroke={1.6} />
          <p>Рубрик пока нет. Авторы выберут их при написании поста.</p>
        </div>
      ) : (
        <div className="ui-rows" style={{ marginTop: '1.25rem' }}>
          { tags.map(tag => <TagRow key={tag.id} tag={resource(tagRowResource, tag)} />) }
        </div>
      ) }
    </>
  );
}
