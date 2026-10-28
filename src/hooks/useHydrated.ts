import 'client-only';
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// false на сервере и во время гидрации текущего компонента, true — после.
// Работает и для поздно гидрируемых Suspense-границ, поэтому глобальный флаг
// «приложение гидрировано» вместо него использовать нельзя.
export default function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
