'use client'

import 'client-only';
import { osmUrl } from "@/domains/posts/shared/postTypes";
import { IconExternalLink, IconMap2 } from "@tabler/icons-react";
import dynamic from "next/dynamic";

const PostMapView = dynamic(() => import('@/domains/posts/components/map/PostMapView'), {
  ssr: false,
  // Заглушка той же высоты: страница не прыгает, и сервер с клиентом рисуют одно и то же
  loading: () => <div className="ui-map ui-map--loading" />
});

// Точка путешествия на странице поста: карточка с заголовком, координаты — ссылкой на OSM.
export default function PostLocationMap({ lat, lng }: { lat: number, lng: number }) {
  return (
    <div className="ui-map-block">
      <div className="ui-map-block__head">
        <span className="ui-map-block__title"><IconMap2 size={18} stroke={1.8} />Место на карте</span>
        <a href={osmUrl(lat, lng)} target="_blank" rel="noopener noreferrer" title="Открыть в OpenStreetMap">
          { lat.toFixed(4) }, { lng.toFixed(4) }<IconExternalLink size={14} stroke={1.8} />
        </a>
      </div>
      <PostMapView lat={lat} lng={lng} />
    </div>
  );
}
