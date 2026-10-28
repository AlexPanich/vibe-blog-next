'use client';

import 'client-only';
import useUser from "@/hooks/useUser";
import { AuthUser } from "@/shared/authUser";
import { ReactNode } from "react";

type UserGateProps = {
  fallback?: ReactNode,
  guest?: ReactNode,
  auth?: (user: AuthUser) => ReactNode
}

// Гидрация всегда идёт по fallback, guest / auth — только после неё.
export default function UserGate({ fallback = null, guest = null, auth }: UserGateProps) {
  const { user, ready } = useUser();

  if(!ready){
    return fallback;
  }

  if(!user){
    return guest;
  }

  return auth ? auth(user) : null;
}
