'use client'

import 'client-only';
import ErrorScreen from "@/components/general/ErrorScreen";
import ButtonLink from "@/components/general/ButtonLink";
import { Button } from "@mantine/core";
import { IconRotateClockwise } from "@tabler/icons-react";

// Падение рендера в кабинете — меню остаётся рабочим (спека 52). retry() — см. (public)/error.tsx
export default function OfficeError({ retry }: { error: unknown, retry: () => void }) {
  return (
    <>
      <title>Ошибка — Кабинет</title>
      <ErrorScreen
        kicker="Ошибка"
        title="Что-то пошло не так"
        actions={<>
          <Button size="md" className="ui-ink-button" leftSection={<IconRotateClockwise size={17} />} onClick={retry}>Попробовать ещё раз</Button>
          <ButtonLink href="/office" size="md" variant="default">В кабинет</ButtonLink>
        </>}
      >
        Раздел не смог загрузиться. Попробуйте ещё раз — меню работает как обычно.
      </ErrorScreen>
    </>
  );
}
