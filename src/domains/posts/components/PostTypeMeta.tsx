import type { PostDetailsResource } from "@/domains/posts/dto/postResources";
import { osmUrl, POST_TYPE_LABELS } from "@/domains/posts/shared/postTypes";
import { formatTravelDays, routeSummary } from "@/domains/posts/shared/postRoute";
import { IconLanguage, IconMapPin } from "@tabler/icons-react";

type PostTypeMetaProps = {
  // routeKm — длина маршрута по прямой (спека 37); null — одна точка или не travel
  post: PostDetailsResource & { routeKm: number | null },
  // Только метка — там, где вся строка уже ссылка: <a> внутри <a> невалиден
  compact?: boolean
}

/*
  Тип поста в мета-строке: у обычного ничего, у перевода — ссылка на оригинал, у
  путешествия — координаты ссылкой на карту, у маршрута вместо них «≈ N км · M дней»
  (спека 37). Без 'use client' — работает в обоих мирах
*/
export default function PostTypeMeta({ post, compact = false }: PostTypeMetaProps) {
  if(post.type === 'simple'){
    return null;
  }

  const Icon = post.type === 'translate' ? IconLanguage : IconMapPin;

  return <>
    <span className="ui-meta__item ui-post-type">
      <Icon size={14} stroke={1.8} />{ POST_TYPE_LABELS[post.type] }
    </span>
    { !compact && post.type === 'translate' && post.source && <a
      className="ui-meta__item"
      href={post.source}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      Оригинал
    </a> }
    { !compact && post.type === 'travel' && post.routeKm !== null && <span className="ui-meta__item">
      { routeSummary(post.routeKm, post.travelDays).join(' · ') }
    </span> }
    { !compact && post.type === 'travel' && post.routeKm === null && post.lat !== null && post.lng !== null && <a
      className="ui-meta__item"
      href={osmUrl(post.lat, post.lng)}
      target="_blank"
      rel="noopener noreferrer"
    >
      { post.lat.toFixed(4) }, { post.lng.toFixed(4) }
    </a> }
    { !compact && post.type === 'travel' && post.routeKm === null && post.travelDays !== null && <span className="ui-meta__item">
      { formatTravelDays(post.travelDays) }
    </span> }
  </>
}
