'use client'

import 'client-only';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint } from "@/core/geo";
import { divIcon, latLngBounds, type LatLngTuple } from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useMemo } from "react";

export type PostMapViewProps = {
  points: GeoPoint[],
  // Редактор: клик добавляет точку, метки перетаскиваются; без них карта только показывает
  onAdd?: (lat: number, lng: number) => void,
  onMove?: (index: number, lat: number, lng: number) => void
}

/*
  Сама карта Leaflet. Leaflet трогает window при импорте, поэтому файл грузится только
  через dynamic(..., { ssr: false }) — PostRouteMap / PostRouteEditor.
  Одна точка в показе — круглая метка; маршрут и редактор — линия и номерные метки (спека 37)
*/
export default function PostMapView({ points, onAdd, onMove }: PostMapViewProps) {
  const positions = points.map(point => [ point.lat, point.lng ] as LatLngTuple);
  const editable = onAdd !== undefined || onMove !== undefined;
  const icons = useMemo(() => numberIcons(positions.length), [ positions.length ]);

  return (
    <MapContainer
      className={editable ? 'ui-map ui-map--edit' : 'ui-map'}
      center={positions[0] ?? EUROPE}
      zoom={positions.length > 0 ? POINT_ZOOM : 3}
      // Колесо не зумирует, пока по карте не кликнули: иначе страница перестаёт прокручиваться
      scrollWheelZoom={false}
    >
      {/* Тайлы OSM без ключа; тёмная тема затемняет их фильтром в layout.css */}
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <WheelOnFocus />
      <FitOnMount points={positions} />
      { onAdd && <PickOnClick onAdd={onAdd} /> }
      { positions.length > 1 && <Polyline positions={positions} className="ui-map__route" /> }
      { !editable && positions.length === 1
        ? <CircleMarker center={positions[0]} radius={9} className="ui-map__marker" />
        : positions.map((position, index) => <Marker
          key={index}
          position={position}
          icon={icons[index]}
          draggable={onMove !== undefined}
          eventHandlers={onMove && { dragend: e => { const { lat, lng } = e.target.getLatLng().wrap(); onMove(index, lat, lng) } }}
        />) }
    </MapContainer>
  );
}

const EUROPE: LatLngTuple = [ 50, 15 ];

const POINT_ZOOM = 10;

/*
  Номерная метка: CircleMarker не перетаскивается и не несёт текст, а стандартная картинка
  Marker ломается в бандле — divIcon на CSS. В html только число, не пользовательский текст
*/
function numberIcons(count: number){
  return Array.from({ length: count }, (_, index) => divIcon({
    className: 'ui-map__num',
    html: String(index + 1),
    iconSize: [ 26, 26 ],
    iconAnchor: [ 13, 13 ]
  }));
}

function PickOnClick({ onAdd }: { onAdd: (lat: number, lng: number) => void }){
  // wrap: за краем карты мир повторяется, и долгота уходит за ±180
  useMapEvents({ click: e => { const { lat, lng } = e.latlng.wrap(); onAdd(lat, lng) } });

  return null;
}

function WheelOnFocus(){
  const map = useMapEvents({
    click: () => map.scrollWheelZoom.enable(),
    mouseout: () => map.scrollWheelZoom.disable()
  });

  return null;
}

// Границы — один раз при открытии: после клика или перетаскивания в редакторе карта не прыгает
function FitOnMount({ points }: { points: LatLngTuple[] }){
  const map = useMap();

  useEffect(() => {
    if(points.length > 1){
      map.fitBounds(latLngBounds(points), { padding: [ 24, 24 ], maxZoom: POINT_ZOOM });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ map ]);

  return null;
}
