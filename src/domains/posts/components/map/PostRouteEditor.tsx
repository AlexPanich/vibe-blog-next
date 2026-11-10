'use client'

import 'client-only';
import type { RouteFormPoint } from "@/domains/posts/hooks/usePostForm";
import { POST_ROUTE_MAX, ROUTE_LABEL_MAX, TRAVEL_DAYS_MAX } from "@/domains/posts/dto/postRequests";
import { ActionIcon, Input, NumberInput, TextInput } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconX } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { useRef } from "react";

const PostMapView = dynamic(() => import('@/domains/posts/components/map/PostMapView'), {
  ssr: false,
  loading: () => <div className="ui-map ui-map--loading" />
});

export type PostRouteErrors = {
  points?: string,
  labels: (string | undefined)[],
  travelDays?: string
}

type PostRouteEditorProps = {
  points: RouteFormPoint[],
  onChange: (points: RouteFormPoint[]) => void,
  travelDays: number | string,
  onTravelDays: (value: number | string) => void,
  errors: PostRouteErrors
}

/*
  Маршрут путешествия в форме (спека 37): клик по карте добавляет точку в конец, метку можно
  перетащить. Под картой — список: подпись, ↑/↓ и удаление (работает с клавиатуры и на
  телефоне, без drag-and-drop). Последнюю оставшуюся точку удалить нельзя
*/
export default function PostRouteEditor({ points, onChange, travelDays, onTravelDays, errors }: PostRouteEditorProps) {
  // Ключи новых точек — после начальных (у тех ключ — индекс)
  const nextKey = useRef(points.length);
  const full = points.length >= POST_ROUTE_MAX;

  function add(lat: number, lng: number){
    if(full){
      return;
    }

    onChange([ ...points, { key: nextKey.current++, lat: round(lat), lng: round(lng), label: '' } ]);
  }

  function patch(index: number, changes: Partial<RouteFormPoint>){
    onChange(points.map((point, i) => i === index ? { ...point, ...changes } : point));
  }

  function swap(index: number, other: number){
    const next = [ ...points ];
    [ next[index], next[other] ] = [ next[other], next[index] ];
    onChange(next);
  }

  return (
    <div className="ui-route">
      <PostMapView
        points={points}
        onAdd={add}
        onMove={(index, lat, lng) => patch(index, { lat: round(lat), lng: round(lng) })}
      />
      <p className="ui-route__hint">
        { full ? `Это максимум — ${POST_ROUTE_MAX} точек` : 'Кликните по карте, чтобы добавить точку · метку можно перетащить' }
      </p>
      { errors.points && <Input.Error>{ errors.points }</Input.Error> }
      { points.length > 0 && <ol className="ui-route-list">
        { points.map((point, index) => <li key={point.key} className="ui-route-row">
          <span className="ui-route-row__num" aria-hidden>{ index + 1 }</span>
          <TextInput
            className="ui-route-row__label"
            aria-label={`Подпись точки ${index + 1}`}
            placeholder="Подпись, например Гуниб"
            maxLength={ROUTE_LABEL_MAX}
            value={point.label}
            onChange={e => patch(index, { label: e.target.value })}
            error={errors.labels[index]}
          />
          <span className="ui-route-row__coords">{ point.lat.toFixed(4) }, { point.lng.toFixed(4) }</span>
          <span className="ui-route-row__buttons">
            <ActionIcon
              variant="default"
              size={36}
              aria-label={`Точка ${index + 1} выше`}
              title="Выше"
              disabled={index === 0}
              onClick={() => swap(index, index - 1)}
            >
              <IconArrowUp size={16} />
            </ActionIcon>
            <ActionIcon
              variant="default"
              size={36}
              aria-label={`Точка ${index + 1} ниже`}
              title="Ниже"
              disabled={index === points.length - 1}
              onClick={() => swap(index, index + 1)}
            >
              <IconArrowDown size={16} />
            </ActionIcon>
            <ActionIcon
              variant="default"
              size={36}
              aria-label={`Удалить точку ${index + 1}`}
              title="Удалить"
              disabled={points.length === 1}
              onClick={() => onChange(points.filter((_, i) => i !== index))}
            >
              <IconX size={16} />
            </ActionIcon>
          </span>
        </li>) }
      </ol> }
      <NumberInput
        className="ui-route__days"
        label="Дней в пути"
        placeholder="Необязательно"
        min={1}
        max={TRAVEL_DAYS_MAX}
        allowDecimal={false}
        allowNegative={false}
        value={travelDays}
        onChange={onTravelDays}
        error={errors.travelDays}
      />
    </div>
  );
}

// До 6 знаков после запятой — как в схеме запроса
function round(value: number){
  return Math.round(value * 1e6) / 1e6;
}
