'use client'

import 'client-only';
import ErrorScreen from "@/components/general/ErrorScreen";
import ButtonLink from "@/components/general/ButtonLink";
import { Button } from "@mantine/core";
import { IconRotateClockwise } from "@tabler/icons-react";

/*
  Падение рендера в публичной части — внутри шапки и подвала (спека 52). retry(), а не
  reset(): заново запрашивает серверные данные, reset() только перерисовал бы тот же ответ
*/
export default function PublicError({ retry }: { error: unknown, retry: () => void }) {
  return (
    <>
      <title>Ошибка — Vibe</title>
      <ErrorScreen
        kicker="Ошибка"
        title="Что-то пошло не так"
        actions={<>
          <Button size="md" className="ui-ink-button" leftSection={<IconRotateClockwise size={17} />} onClick={retry}>Попробовать ещё раз</Button>
          <ButtonLink href="/posts" size="md" variant="default">В ленту</ButtonLink>
        </>}
      >
        Страница не смогла загрузиться. Обычно помогает попробовать ещё раз — если нет, вернитесь в ленту.
      </ErrorScreen>
    </>
  );
}
