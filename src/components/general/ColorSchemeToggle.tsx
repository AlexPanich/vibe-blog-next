'use client';

import 'client-only';
import { defaultColorScheme } from "@/theme/colorScheme";
import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

// Схему на сервере не знаем, поэтому разметка от неё не зависит: рендерим обе
// иконки, лишнюю прячет CSS по data-mantine-color-scheme. Иначе — hydration mismatch.
export default function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme(defaultColorScheme);

  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="lg"
      radius="sm"
      aria-label="Переключить тему"
      title="Переключить тему"
      onClick={() => setColorScheme(computed === 'dark' ? 'light' : 'dark')}
    >
      <IconSun size={18} className="mantine-light-hidden" />
      <IconMoon size={18} className="mantine-dark-hidden" />
    </ActionIcon>
  );
}
