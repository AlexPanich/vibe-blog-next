'use client'

import 'client-only';
import ErrorScreen from "@/components/general/ErrorScreen";
import Brand from "@/components/layout/Brand";
import { fontVariables } from "@/theme/fonts";
import { defaultColorScheme } from "@/theme/colorScheme";
import { theme } from "@/theme/theme";
import { Button, ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { IconRotateClockwise } from "@tabler/icons-react";
import "@mantine/core/styles.css";
import "@/theme/tokens.css";
import "@/theme/layout.css";

/*
  Упал сам root layout (спека 52). Next заменяет им layout целиком: свой <html>, стили, шрифты
  и тема — здесь. Токены ссылаются на переменные Mantine, поэтому нужен MantineProvider.
  ClientSideInitializer не берём: сессия и живой канал могли быть причиной падения.
  «На главную» — обычный <a>: полная перезагрузка вместо клиентского перехода в упавшее дерево
*/
export default function GlobalError({ retry }: { error: unknown, retry: () => void }) {
  return (
    <html lang="ru" {...mantineHtmlProps} className={fontVariables}>
      <head>
        <title>Ошибка — Vibe</title>
        <ColorSchemeScript defaultColorScheme={defaultColorScheme} />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme={defaultColorScheme}>
          <main className="ui-shell ui-error-page">
            <div>
              <Brand />
              <ErrorScreen
                kicker="Сбой приложения"
                title="Что-то пошло не так"
                actions={<>
                  <Button size="md" className="ui-ink-button" leftSection={<IconRotateClockwise size={17} />} onClick={retry}>Попробовать ещё раз</Button>
                  <Button component="a" href="/" size="md" variant="default">На главную</Button>
                </>}
              >
                Сайт не смог открыть страницу. Попробуйте ещё раз через минуту — если не помогает, начните с главной.
              </ErrorScreen>
            </div>
          </main>
        </MantineProvider>
      </body>
    </html>
  );
}
