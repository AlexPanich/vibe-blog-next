import 'client-only';
import { UserContext } from "@/contexts/UserContext";
import useHydrated from "@/hooks/useHydrated";
import { AuthUser } from "@/shared/authUser";
import { useContext } from "react";

// ready — пользователь известен и компонент уже гидрирован.
// Пока ready === false, рендерить то же, что на сервере (заглушку).
export default function useUser(): { user: AuthUser | null, ready: boolean } {
  const { user, loaded } = useContext(UserContext);
  const hydrated = useHydrated();

  return { user, ready: loaded && hydrated };
}
