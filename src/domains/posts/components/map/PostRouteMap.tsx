'use client'

import 'client-only';
import { routeKm } from "@/core/geo";
import { StrictResource } from "@/core/resource";
import type { RoutePointsResource } from "@/domains/posts/dto/postResources";
import { routeSummary } from "@/domains/posts/shared/postRoute";
import { osmUrl } from "@/domains/posts/shared/postTypes";
import { IconExternalLink, IconMap2, IconRoute } from "@tabler/icons-react";
import dynamic from "next/dynamic";

const PostMapView = dynamic(() => import('@/domains/posts/components/map/PostMapView'), {
  ssr: false,
  // Заглушка той же высоты: страница не прыгает, и сервер с клиентом рисуют одно и то же
  loading: () => <div className="ui-map ui-map--loading" />
});

type PostRouteMapProps<T extends RoutePointsResource> = {
  points: StrictResource<T, RoutePointsResource>,
  travelDays: number | null
}

/*
  Карта путешествия на странице поста и в превью модератора (спека 37). Одна точка — «Место на
  карте» с координатами ссылкой на OSM; маршрут — линия, номера, длина по прямой и список подписей
*/
export default function PostRouteMap<T extends RoutePointsResource>({ points, travelDays }: PostRouteMapProps<T>) {
  if(points.length === 1){
    const [ { lat, lng } ] = points;
    const days = routeSummary(null, travelDays);

    return (
      <div className="ui-map-block">
        <div className="ui-map-block__head">
          <span className="ui-map-block__title"><IconMap2 size={18} stroke={1.8} />Место на карте</span>
          <span className="ui-map-block__meta">
            <a href={osmUrl(lat, lng)} target="_blank" rel="noopener noreferrer" title="Открыть в OpenStreetMap">
              { lat.toFixed(4) }, { lng.toFixed(4) }<IconExternalLink size={14} stroke={1.8} />
            </a>
            { days.map(part => <span key={part}> · { part }</span>) }
          </span>
        </div>
        <PostMapView points={points} />
      </div>
    );
  }

  return (
    <div className="ui-map-block">
      <div className="ui-map-block__head">
        <span className="ui-map-block__title"><IconRoute size={18} stroke={1.8} />Маршрут поездки</span>
        <span className="ui-map-block__meta">{ routeSummary(routeKm(points), travelDays, true).join(' · ') }</span>
      </div>
      <PostMapView points={points} />
      <ol className={points.length > 6 ? 'ui-route-points ui-route-points--wide' : 'ui-route-points'}>
        { points.map((point, index) => <li key={index}>{ point.label ?? `Точка ${index + 1}` }</li>) }
      </ol>
    </div>
  );
}
