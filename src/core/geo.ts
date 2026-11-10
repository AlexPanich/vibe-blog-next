export type GeoPoint = { lat: number, lng: number }

// Расстояние по дуге большого круга (формула гаверсинуса), км
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Сумма отрезков между соседними точками; меньше двух точек — null
export function routeKm(points: GeoPoint[]): number | null {
  if(points.length < 2){
    return null;
  }

  let km = 0;

  for(let i = 1; i < points.length; i++){
    km += haversineKm(points[i - 1], points[i]);
  }

  return km;
}

const EARTH_RADIUS_KM = 6371;

function radians(deg: number){
  return deg * Math.PI / 180;
}
