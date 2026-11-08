import { CONTAINER } from "@/globals/container";
import { manageTags } from "@/domains/tags/policy";
import Link from "@/components/general/Link";
import OfficeHead from "@/components/layout/OfficeHead";
import TagCreateButton from "@/domains/tags/components/moderation/TagCreateButton";
import TagSearch from "@/domains/tags/components/moderation/TagSearch";
import TagSortMenu from "@/domains/tags/components/moderation/TagSortMenu";
import TagTable from "@/domains/tags/components/moderation/TagTable";
import TagTableRow from "@/domains/tags/components/moderation/TagTableRow";
import { tagModerationFilterDto } from "@/domains/tags/dto/tagModerationRequests";
import { tagModerationRowResource } from "@/domains/tags/dto/tagModerationResources";
import { loadModerationTags } from "@/domains/tags/shared/loadModerationTags";
import { tagModerationUrl } from "@/domains/tags/shared/tagModerationUrl";
import { resource } from "@/core/resource";
import { plural } from "@/core/plural";
import { IconSearch, IconTags } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Рубрики' };

/*
  Справочник рубрик (спека 42, шаг 16): поиск (?q=), сортировка (?sort=), таблица с
  числом постов и подписчиков, переименование и удаление. Слияние — спека 47
*/
export default async function ModerationTags({ searchParams }: PageProps<'/office/moderation/tags'>) {
  await CONTAINER.boucerService.breakIfCant(manageTags);

  const filter = tagModerationFilterDto.parse(await searchParams);
  const { total, rows } = await loadModerationTags(filter);

  return (
    <>
      <OfficeHead
        title="Рубрики"
        sub={`${total} ${plural(total, [ 'рубрика', 'рубрики', 'рубрик' ])} · авторы выбирают их при написании поста`}
        action={<TagCreateButton />}
      />

      { total === 0 ? (
        <div className="ui-empty">
          <IconTags size={26} stroke={1.6} />
          <p>Рубрик пока нет. Добавьте первые — авторы выберут их при написании поста.</p>
        </div>
      ) : (
        <>
          <div className="ui-tag-bar">
            <TagSearch filter={filter} />
            <TagSortMenu filter={filter} />
          </div>

          { rows.length === 0 ? (
            <div className="ui-empty">
              <IconSearch size={26} stroke={1.6} />
              <p>По запросу «{ filter.q }» рубрик нет. <Link href={tagModerationUrl({ sort: filter.sort })}>Сбросить поиск</Link></p>
            </div>
          ) : (
            <TagTable>
              { rows.map(tag => <TagTableRow key={tag.id} tag={resource(tagModerationRowResource, tag)} />) }
            </TagTable>
          ) }
        </>
      ) }
    </>
  );
}
