'use client'

import 'client-only';
import Link from "@/components/general/Link";
import { TAG_SORTS, TAG_SORT_LABELS, type TagModerationFilterDto } from "@/domains/tags/dto/tagModerationRequests";
import { tagModerationUrl } from "@/domains/tags/shared/tagModerationUrl";
import { Menu, MenuDropdown, MenuItem, MenuTarget } from "@mantine/core";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";

// Пилюля сортировки справочника рубрик (спека 42, шаг 16): ссылки, поиск сохраняется
export default function TagSortMenu({ filter }: { filter: TagModerationFilterDto }) {
  return (
    <Menu position="bottom-end" withinPortal>
      <MenuTarget>
        <button type="button" className="ui-tag-bar__sort" aria-label={`Сортировка: ${TAG_SORT_LABELS[filter.sort]}`}>
          { TAG_SORT_LABELS[filter.sort] }
          <IconChevronDown size={15} stroke={2} />
        </button>
      </MenuTarget>
      <MenuDropdown>
        { TAG_SORTS.map(sort => (
          <MenuItem
            key={sort}
            component={Link}
            href={tagModerationUrl({ q: filter.q, sort })}
            rightSection={sort === filter.sort ? <IconCheck size={14} /> : undefined}
          >
            { TAG_SORT_LABELS[sort] }
          </MenuItem>
        )) }
      </MenuDropdown>
    </Menu>
  );
}
