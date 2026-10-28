import 'client-only';
import { UserContext } from "@/contexts/UserContext";
import { useContext } from "react";

// Сброс пользователя после выхода. В кабинете не нужен: выход оттуда — смена root layout и полная загрузка
export default function useSetUser(){
  return useContext(UserContext).setUser;
}
