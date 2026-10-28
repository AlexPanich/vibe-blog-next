'use client';

import 'client-only';
import useHydrated from "@/hooks/useHydrated";
import { ReactNode } from "react";

type ClientValueProps = {
  server: ReactNode,
  client: () => ReactNode
}

// Аналог data-allow-mismatch из Vue: гидрация идёт по server, после неё побеждает client.
// server должен быть детерминированным — одинаковым на сервере и в браузере.
export default function ClientValue({ server, client }: ClientValueProps) {
  return useHydrated() ? client() : server;
}
