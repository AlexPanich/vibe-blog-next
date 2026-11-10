'use client'

import 'client-only';
import Link from "@/components/general/Link";
import { Menu, MenuDropdown, MenuItem, MenuTarget } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import type { Route } from "next";

type PostMoreTabProps = {
  // Редкие вкладки (статусы, рубрики) с подписью, ссылкой и числом — ссылки собирает сервер
  items: { key: string, label: string, href: Route, count: number }[],
  active?: string
}

/*
  «Ещё ▾» в ряду вкладок (спеки 42, 44): в макете вкладок меньше, чем статусов или рубрик,
  редкие уходят в меню — иначе ряд не помещается. Выбрана редкая — пилюля называется ею и
  горит
*/
export default function PostMoreTab({ items, active }: PostMoreTabProps) {
  const current = active === undefined ? undefined : items.find(item => item.key === active);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <Menu position="bottom-start" withinPortal>
      <MenuTarget>
        <button type="button" className="ui-tabs__more" data-active={current !== undefined}>
          { current?.label ?? 'Ещё' }
          <span className="ui-tabs__count">{ current ? current.count : total }</span>
          <IconChevronDown size={14} stroke={2} />
        </button>
      </MenuTarget>
      <MenuDropdown>
        { items.map(item => (
          <MenuItem
            key={item.key}
            component={Link}
            href={item.href}
            rightSection={<span className="ui-tabs__count">{ item.count }</span>}
          >
            { item.label }
          </MenuItem>
        )) }
      </MenuDropdown>
    </Menu>
  );
}
