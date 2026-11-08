'use client'

import 'client-only';
import type { PostStatus } from "@/database/schema";
import Link from "@/components/general/Link";
import { POST_STATUS_TAB_LABELS } from "@/domains/posts/shared/postStatuses";
import { Menu, MenuDropdown, MenuItem, MenuTarget } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import type { Route } from "next";

type PostStatusMoreTabProps = {
  // Редкие статусы со ссылкой на вкладку и числом постов — ссылки собирает сервер
  items: { status: PostStatus, href: Route, count: number }[],
  active?: PostStatus
}

/*
  «Ещё ▾» в вкладках статусов (спека 42): в макете вкладок меньше, чем статусов, редкие
  (отклонённые, архив, …) уходят в меню — иначе ряд не помещается. Выбран редкий статус —
  пилюля называется им и горит
*/
export default function PostStatusMoreTab({ items, active }: PostStatusMoreTabProps) {
  const current = items.find(item => item.status === active);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <Menu position="bottom-start" withinPortal>
      <MenuTarget>
        <button type="button" className="ui-tabs__more" data-active={current !== undefined}>
          { current ? POST_STATUS_TAB_LABELS[current.status] : 'Ещё' }
          <span className="ui-tabs__count">{ current ? current.count : total }</span>
          <IconChevronDown size={14} stroke={2} />
        </button>
      </MenuTarget>
      <MenuDropdown>
        { items.map(item => (
          <MenuItem
            key={item.status}
            component={Link}
            href={item.href}
            rightSection={<span className="ui-tabs__count">{ item.count }</span>}
          >
            { POST_STATUS_TAB_LABELS[item.status] }
          </MenuItem>
        )) }
      </MenuDropdown>
    </Menu>
  );
}
