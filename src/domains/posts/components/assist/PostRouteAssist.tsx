'use client'

import 'client-only';
import type { PostRoutePointResult } from "@/domains/posts/dto/postAssistResources";
import { POST_ROUTE_MAX } from "@/domains/posts/dto/postRequests";
import type { RouteFormPoint } from "@/domains/posts/hooks/usePostForm";
import { Button, Tooltip } from "@mantine/core";
import dynamic from "next/dynamic";
import { useState } from "react";

const PostMapView = dynamic(() => import('@/domains/posts/components/map/PostMapView'), {
  ssr: false,
  loading: () => <div className="ui-map ui-map--compact ui-map--loading" />
});

export type PostRouteAddPoint = { lat: number, lng: number, label: string }

type PostRouteAssistProps = {
  points: PostRoutePointResult[],
  current: RouteFormPoint[],
  onAdd: (points: PostRouteAddPoint[]) => void
}

/*
  Места из текста (спека 55, п. 7 и 12). Координаты даёт модель, поэтому сначала предпросмотр на
  карте, и каждую точку автор принимает сам. Точки встают в конец маршрута, до POST_ROUTE_MAX:
  «Добавить все» берёт столько, сколько влезает
*/
export default function PostRouteAssist({ points, current, onAdd }: PostRouteAssistProps){
  // Добавленные и пропущенные пропадают из карты и списка
  const [ hidden, setHidden ] = useState<Set<number>>(() => new Set());
  const visible = points.map((point, index) => ({ point, index })).filter(item => !hidden.has(item.index));
  const room = POST_ROUTE_MAX - current.length;
  const limitHint = `Не больше ${POST_ROUTE_MAX} точек`;

  function hide(indexes: number[]){
    setHidden(prev => new Set([ ...prev, ...indexes ]));
  }

  function add(items: typeof visible){
    const taken = items.slice(0, Math.max(0, room));

    if(taken.length === 0){
      return;
    }

    onAdd(taken.map(({ point }) => ({ lat: point.lat, lng: point.lng, label: point.label })));
    hide(taken.map(item => item.index));
  }

  if(visible.length === 0){
    return <p className="ui-assist__state">Все места разобраны</p>;
  }

  return (
    <div className="ui-assist__route">
      <PostMapView compact points={visible.map(({ point }) => point)} />
      <ol className="ui-assist__points">
        { visible.map((item, number) => <li key={item.index} className="ui-assist__point">
          <span className="ui-route-row__num" aria-hidden>{ number + 1 }</span>
          <div className="ui-assist__point-text">
            <span className="ui-assist__point-label">{ item.point.label }</span>
            <span className="ui-assist__point-quote">«{ item.point.quote }»</span>
          </div>
          <div className="ui-assist__issue-buttons">
            <Tooltip label={limitHint} disabled={room > 0} withArrow>
              <span>
                <Button type="button" variant="light" size="compact-sm" disabled={room <= 0} onClick={() => add([ item ])}>
                  Добавить
                </Button>
              </span>
            </Tooltip>
            <Button type="button" variant="subtle" color="gray" size="compact-sm" onClick={() => hide([ item.index ])}>
              Пропустить
            </Button>
          </div>
        </li>) }
      </ol>
      <Tooltip label={limitHint} disabled={room > 0} withArrow>
        <span className="ui-assist__all">
          <Button type="button" variant="default" size="compact-sm" disabled={room <= 0} onClick={() => add(visible)}>
            Добавить все
          </Button>
        </span>
      </Tooltip>
    </div>
  );
}
