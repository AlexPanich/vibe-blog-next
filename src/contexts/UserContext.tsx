import 'client-only';
import { AuthUser } from "@/shared/authUser";
import { createContext } from "react";

// Напрямую не читать — только через useUser() / UserGate / useSetUser()
export type UserContextType = {
  user: AuthUser | null,
  // сессия загружена: известно, есть пользователь или нет
  loaded: boolean,
  // Выход в публичной части: мягкая навигация не перезагружает layout, пользователя сбрасываем руками
  setUser: (user: AuthUser | null) => void
}

export const UserContext = createContext<UserContextType>({
  user: null,
  loaded: false,
  setUser: () => {}
});
