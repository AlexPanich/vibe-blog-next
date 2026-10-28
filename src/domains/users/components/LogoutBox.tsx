'use client'

import 'client-only';
import useLogout from "@/domains/users/hooks/useLogout";
import { Button, type ButtonProps } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";

export default function LogoutBox(props: ButtonProps) {
  const { logout, pending } = useLogout();

  return (
    <Button
      variant="subtle"
      color="gray"
      leftSection={<IconLogout size={16} />}
      {...props}
      loading={pending}
      onClick={logout}
    >
      Выйти
    </Button>
  );
}
