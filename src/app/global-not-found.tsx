import ClientSideInitializer from "@/components/general/ClientSideInitializer";
import ColorSchemeToggle from "@/components/general/ColorSchemeToggle";
import ErrorScreen from "@/components/general/ErrorScreen";
import ButtonLink from "@/components/general/ButtonLink";
import Brand from "@/components/layout/Brand";
import SiteFooter from "@/components/layout/SiteFooter";
import TopMenu from "@/components/navigation/TopMenu";
import { fontVariables } from "@/theme/fonts";
import { defaultColorScheme } from "@/theme/colorScheme";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { IconNews } from "@tabler/icons-react";
import type { Metadata } from "next";
import "@mantine/core/styles.css";
import "@/theme/tokens.css";
import "@/theme/layout.css";

export const metadata: Metadata = {
  title: 'Страница не найдена — Vibe'
};

/*
  Адрес не совпал ни с одним маршрутом (спека 52, флаг experimental.globalNotFound). Root
  layout'ов два, общего не-found над ними нет, поэтому Next рендерит этот файл вместо layout:
  свой <html>, стили, шрифты и тема. Шапка упрощённая — бренд, меню и тема, без поиска и
  пользователя: адрес мог быть и из кабинета, и из публичной части
*/
export default function GlobalNotFound() {
  return (
    <html lang="ru" {...mantineHtmlProps} className={fontVariables}>
      <head>
        <ColorSchemeScript defaultColorScheme={defaultColorScheme} />
      </head>
      <body className="ui-page">
        <ClientSideInitializer>
          <header className="ui-masthead">
            <div className="ui-shell ui-masthead__row">
              <Brand />
              <TopMenu />
              <div className="ui-masthead__aside">
                <ColorSchemeToggle />
              </div>
            </div>
          </header>
          <main className="ui-shell ui-main">
            <ErrorScreen
              code="404"
              kicker="Ошибка 404"
              title="Такого адреса нет"
              actions={<>
                <ButtonLink href="/posts" size="md" className="ui-ink-button" leftSection={<IconNews size={17} />}>В ленту</ButtonLink>
                <ButtonLink href="/" size="md" variant="default">На главную</ButtonLink>
              </>}
            >
              Проверьте адрес — или начните с ленты: там все свежие истории.
            </ErrorScreen>
          </main>
          <SiteFooter />
        </ClientSideInitializer>
      </body>
    </html>
  );
}
