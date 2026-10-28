import 'client-only';
import { AuthUser } from "@/shared/authUser";
import { createContext } from "react";

// Напрямую не читать — только через useUser() / UserGate
export type UserContextType = {
  user: AuthUser | null,
  // сессия загружена: известно, есть пользователь или нет
  loaded: boolean
}

export const UserContext = createContext<UserContextType>({
  user: null,
  loaded: false
});
