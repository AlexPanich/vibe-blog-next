'use client'

import 'client-only';
import { useUserBlock } from "@/domains/users/components/block/userBlockContext";
import { MenuItem } from "@mantine/core";
import { IconBan } from "@tabler/icons-react";

/*
  «Заблокировать» в меню «…» шапки автора. Окно подтверждения — в UserBlockButton: пункт
  только открывает его. Уже заблокирован или блокировка встречная — пункта нет, действие
  стоит строкой под шапкой
*/
export default function UserBlockMenuItem() {
  const { state, setConfirming } = useUserBlock();

  if(!state?.canBlock || state.blocking || state.blockedBy){
    return null;
  }

  return <MenuItem color="red" leftSection={<IconBan size={16} stroke={1.8} />} onClick={() => setConfirming(true)}>
    Заблокировать
  </MenuItem>;
}
