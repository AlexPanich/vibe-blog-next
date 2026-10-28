'use client'

import 'client-only';
import { osmUrl } from "@/domains/posts/shared/postTypes";
import { IconExternalLink } from "@tabler/icons-react";
import dynamic from "next/dynamic";

const PostMapView = dynamic(() => import('@/domains/posts/components/map/PostMapView'), {
  ssr: false,
  // Заглушка той же высоты: страница не прыгает, и сервер с клиентом рисуют одно и то же
  loading: () => <div className="ui-map ui-map--loading" />
});

// Точка путешествия на странице поста.
export default function PostLocationMap({ lat, lng }: { lat: number, lng: number }) {
  return (
    <div className="ui-map-block">
      <PostMapView lat={lat} lng={lng} />
      <a href={osmUrl(lat, lng)} target="_blank" rel="noopener noreferrer" className="ui-meta__item">
        <IconExternalLink size={14} stroke={1.8} />Открыть в OpenStreetMap
      </a>
    </div>
  );
}
