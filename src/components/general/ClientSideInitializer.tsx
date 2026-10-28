'use client';

import 'client-only';
import { UserContext } from "@/contexts/UserContext";
import LiveEventsProvider from "@/components/general/LiveEventsProvider";
import { getSession } from "@/globals/authClient";
import { defaultColorScheme } from "@/theme/colorScheme";
import { theme } from "@/theme/theme";
import { AuthUser } from "@/shared/authUser";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useEffect, useMemo, useState } from "react";

type ClientSideInitializerProps = {
  children: React.ReactNode,
  user?: AuthUser
}

export default function ClientSideInitializer({ children, user: initialUser }: ClientSideInitializerProps){
  // ClientSideInitializer полезен для первичной инициализации чего угодно
  // Вот например, если tacnstack захотим притащить
  // const [ queryClient ] = useState(() => new QueryClient());

  /*
    В кабинете пользователь приходит с сервера из layout на каждый рендер, в том числе после
    router.refresh() — берём его из prop, а не копируем в state: копия осталась бы прежней
    (новый аватар, роли). В публичной части — запрос getSession после гидрации
  */
  const [ sessionUser, setSessionUser ] = useState<AuthUser | null>(null);
  const [ sessionLoaded, setSessionLoaded ] = useState<boolean>(false);
  const user = initialUser ?? sessionUser;
  const loaded = initialUser !== undefined || sessionLoaded;
  const userContext = useMemo(() => ({ user, loaded, setUser: setSessionUser }), [ user, loaded ])

  useEffect(() => {
    if(initialUser){
      return;
    }

    let cancelled = false;

    getSession().catch(() => ({ data: null })).then(result => {
      if(cancelled){
        return;
      }

      if(result.data){
        // todo: mb change some d.ts file in better auth for roles additional field
        const { id, name, email, roles, avatarKey } = result.data.user as unknown as AuthUser;
        // better-auth отдаёт id строкой, в AuthUser он числовой (как в requireAuthUser)
        setSessionUser({ id: +id, name, email, roles, avatarKey: avatarKey ?? null });
      }

      setSessionLoaded(true);
    });

    return () => { cancelled = true };
  }, [ initialUser ]);

  return <MantineProvider theme={theme} defaultColorScheme={defaultColorScheme}>
    { /* Тосты живого канала (спека 29) */ }
    <Notifications position="bottom-right" limit={3} autoClose={6000} />
    <UserContext value={userContext}>
      <LiveEventsProvider>
        { children }
      </LiveEventsProvider>
    </UserContext>
  </MantineProvider>
}
