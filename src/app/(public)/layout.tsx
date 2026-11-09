import ClientSideInitializer from "@/components/general/ClientSideInitializer";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import MobileTabBar from "@/components/navigation/MobileTabBar";
import { fontVariables } from "@/theme/fonts";
import { defaultColorScheme } from "@/theme/colorScheme";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@/theme/tokens.css";
import "@/theme/layout.css";

export const metadata: Metadata = {
  title: { template: "%s — Vibe", default: "Vibe" },
  description: siteConfig.description,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" {...mantineHtmlProps} className={fontVariables}>
      <head>
        <ColorSchemeScript defaultColorScheme={defaultColorScheme} />
        {/* Общая RSS-лента вручную, не metadata.alternates: относительный href без metadataBase (план 32, реш. 2) */}
        <link rel="alternate" type="application/rss+xml" title="Vibe" href="/rss.xml" />
      </head>
      <body className="ui-page">
        <ClientSideInitializer>
          <SiteHeader />
          <main className="ui-shell ui-main">
            {children}
          </main>
          <SiteFooter />
          <MobileTabBar />
        </ClientSideInitializer>
      </body>
    </html>
  );
}
