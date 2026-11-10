import { plural } from "@/core/plural";

// «≈ 412 км», «≈ 5 695 км» (разряды — неразрывным пробелом), меньше 1 км — «< 1 км».
// Локаль задана явно: сервер и браузер форматируют одинаково
export function formatRouteKm(km: number): string {
  return km < 1 ? '< 1 км' : `≈ ${Math.round(km).toLocaleString('ru-RU')} км`;
}

// «1 день / 3 дня / 5 дней»
export function formatTravelDays(days: number): string {
  return `${days} ${plural(days, [ 'день', 'дня', 'дней' ])}`;
}

/*
  Части строки «≈ N км · M дней» без пустых: для мета-строки, карточки и шапки карты.
  withNote — «по прямой» после км: длина считается не по дорогам (спека 37)
*/
export function routeSummary(routeKm: number | null, travelDays: number | null, withNote = false): string[] {
  const parts: string[] = [];

  if(routeKm !== null){
    parts.push(withNote ? `${formatRouteKm(routeKm)} по прямой` : formatRouteKm(routeKm));
  }

  if(travelDays !== null){
    parts.push(formatTravelDays(travelDays));
  }

  return parts;
}
