import ClientSideInitializer from "@/components/general/ClientSideInitializer";
import SiteHeader from "@/components/layout/SiteHeader";
import { inter } from "@/theme/fonts";
import { defaultColorScheme } from "@/theme/colorScheme";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { Metadata } from "next";
import "@mantine/core/styles.css";
import "@/theme/tokens.css";
import "@/theme/layout.css";

export const metadata: Metadata = {
  title: { template: "%s — Vibe", default: "Vibe" },
  description: "Блог, где каждый пост — это ход",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" {...mantineHtmlProps} className={inter.variable}>
      <head>
        <ColorSchemeScript defaultColorScheme={defaultColorScheme} />
      </head>
      <body>
        <ClientSideInitializer>
          <SiteHeader />
          <main className="ui-shell ui-main">
            {children}
          </main>
        </ClientSideInitializer>
      </body>
    </html>
  );
}
