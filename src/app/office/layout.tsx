import ClientSideInitializer from "@/components/general/ClientSideInitializer";
import SiteHeader from "@/components/layout/SiteHeader";
import OfficeDesk from "@/components/layout/OfficeDesk";
import { getAuthUser } from "@/shared/auth";
import { countUnread } from "@/domains/notifications/exports/countUnread";
import { inter } from "@/theme/fonts";
import { defaultColorScheme } from "@/theme/colorScheme";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@/theme/tokens.css";
import "@/theme/layout.css";

export const metadata: Metadata = {
  title: { template: "%s — Кабинет", default: "Кабинет" }
};

export default async function RootLayout({ children }: LayoutProps<"/office">) {
  const user = await getAuthUser();

  /*
    Не unauthorized(): ошибку layout'а ловит только boundary выше, а выше root layout'а
    ничего нет — человек увидел бы голую страницу Next. Кука без сессии (бан, истёкшая
    сессия) proxy пропускает, поэтому уводим на вход здесь
  */
  if(!user){
    return redirect('/auth/login');
  }

  return (
    <html lang="ru" {...mantineHtmlProps} className={inter.variable}>
      <head>
        <ColorSchemeScript defaultColorScheme={defaultColorScheme} />
      </head>
      <body>
        <ClientSideInitializer user={user}>
          <SiteHeader unread={countUnread(user.id)} />
          <main className="ui-shell ui-main">
            <OfficeDesk>
              {children}
            </OfficeDesk>
          </main>
        </ClientSideInitializer>
      </body>
    </html>
  );
}
