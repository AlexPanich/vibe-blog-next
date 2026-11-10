import 'server-only';
import { db } from "@/globals/db";
import { postRoutePoints } from "@/database/schema";
import { routeKm } from "@/core/geo";
import type { RoutePointDto } from "@/domains/posts/dto/postRequests";
import { asc, eq, inArray } from "drizzle-orm";
import { cache } from "react";

export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Точки поста по порядку; cache — общая для страницы и превью
export const getRoutePoints = cache(async (postId: number) => {
  return db.select({ lat: postRoutePoints.lat, lng: postRoutePoints.lng, label: postRoutePoints.label })
    .from(postRoutePoints)
    .where(eq(postRoutePoints.postId, postId))
    .orderBy(asc(postRoutePoints.position));
});

// Длина маршрута по id постов одним запросом (карточки ленты); у кого меньше двух точек — нет в Map
export async function routeKmByPost(postIds: number[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();

  if(postIds.length === 0){
    return result;
  }

  const rows = await db.select({ postId: postRoutePoints.postId, lat: postRoutePoints.lat, lng: postRoutePoints.lng })
    .from(postRoutePoints)
    .where(inArray(postRoutePoints.postId, postIds))
    .orderBy(asc(postRoutePoints.postId), asc(postRoutePoints.position));

  const byPost = Map.groupBy(rows, row => row.postId);

  for(const [ postId, points ] of byPost){
    const km = routeKm(points);

    if(km !== null){
      result.set(postId, km);
    }
  }

  return result;
}

// Точки целиком: delete + insert в транзакции сохранения; [] — стереть (уход с travel)
export function replaceRoutePoints(tx: DBTransaction, postId: number, points: RoutePointDto[]): void {
  tx.delete(postRoutePoints).where(eq(postRoutePoints.postId, postId)).run();

  if(points.length > 0){
    tx.insert(postRoutePoints).values(points.map((point, position) => ({ postId, position, ...point }))).run();
  }
}
