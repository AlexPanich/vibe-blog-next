'use client'

import 'client-only';
import UserGate from "@/components/general/UserGate";
import UserAvatar from "@/domains/users/components/UserAvatar";
import useLogout from "@/domains/users/hooks/useLogout";
import { Button, Group, Menu, MenuDivider, MenuDropdown, MenuItem, MenuLabel, MenuTarget, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconLayoutGrid, IconLogin, IconLogout, IconUserCircle, IconUserPlus } from "@tabler/icons-react";
import Link from "next/link";

// Правый край шапки: гостю — вход и регистрация, вошедшему — меню под аватаром.
export default function UserBox() {
  const { logout, pending } = useLogout();

  return (
    <UserGate
      guest={
        <Group gap="xs" wrap="nowrap">
          <Button
            component={Link}
            href="/auth/login"
            size="sm"
            variant="subtle"
            color="gray"
            leftSection={<IconLogin size={16} />}
          >
            Войти
          </Button>
          <Button
            component={Link}
            href="/auth/signup"
            size="sm"
            leftSection={<IconUserPlus size={16} />}
            visibleFrom="sm"
          >
            Регистрация
          </Button>
        </Group>
      }
      auth={user => (
        <Menu position="bottom-end" width={220} shadow="md" withinPortal>
          <MenuTarget>
            <UnstyledButton className="ui-userbox" aria-label={`Меню пользователя ${user.name}`}>
              <UserAvatar name={user.name} avatarKey={user.avatarKey} size={28} />
              <span className="ui-userbox__name">{ user.name }</span>
              <IconChevronDown size={14} className="ui-userbox__chevron" />
            </UnstyledButton>
          </MenuTarget>
          <MenuDropdown>
            <MenuLabel>{ user.email }</MenuLabel>
            <MenuItem component={Link} href="/office" leftSection={<IconLayoutGrid size={16} />}>
              Кабинет
            </MenuItem>
            <MenuItem component={Link} href="/office/profile" leftSection={<IconUserCircle size={16} />}>
              Профиль
            </MenuItem>
            <MenuDivider />
            <MenuItem color="red" leftSection={<IconLogout size={16} />} disabled={pending} onClick={logout}>
              Выйти
            </MenuItem>
          </MenuDropdown>
        </Menu>
      )}
    />
  );
}
