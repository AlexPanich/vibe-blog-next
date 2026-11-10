'use client'

import 'client-only';
import Link from "@/components/general/Link";
import { FAVORITE_SORTS, FAVORITE_SORT_LABELS, type FavoriteFilterDto } from "@/domains/posts/dto/postFavoriteRequests";
import { favoritesUrl } from "@/domains/posts/shared/favoritesUrl";
import { Menu, MenuDropdown, MenuItem, MenuTarget } from "@mantine/core";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";

// Пилюля сортировки избранного (спека 44): ссылки, вкладка рубрики сохраняется
export default function PostFavoriteSortMenu({ filter }: { filter: FavoriteFilterDto }) {
  return (
    <Menu position="bottom-end" withinPortal>
      <MenuTarget>
        <button type="button" className="ui-sort-pill" aria-label={`Сортировка: ${FAVORITE_SORT_LABELS[filter.sort]}`}>
          { FAVORITE_SORT_LABELS[filter.sort] }
          <IconChevronDown size={15} stroke={2} />
        </button>
      </MenuTarget>
      <MenuDropdown>
        { FAVORITE_SORTS.map(sort => (
          <MenuItem
            key={sort}
            component={Link}
            href={favoritesUrl({ tag: filter.tag, sort })}
            rightSection={sort === filter.sort ? <IconCheck size={14} /> : undefined}
          >
            { FAVORITE_SORT_LABELS[sort] }
          </MenuItem>
        )) }
      </MenuDropdown>
    </Menu>
  );
}
