'use client'

import 'client-only';
import 'leaflet/dist/leaflet.css';
import { divIcon, type LatLngTuple } from "leaflet";
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useEffect } from "react";

export type PostMapViewProps = {
  lat: number | null,
  lng: number | null,
  // Без onChange карта только показывает точку
  onChange?: (lat: number, lng: number) => void
}

/*
  Сама карта Leaflet. Leaflet трогает window при импорте, поэтому файл грузится только
  через dynamic(..., { ssr: false }) — PostLocationMap / PostLocationPicker
*/
export default function PostMapView({ lat, lng, onChange }: PostMapViewProps) {
  const point: LatLngTuple | null = lat !== null && lng !== null ? [ lat, lng ] : null;

  return (
    <MapContainer
      className="ui-map"
      center={point ?? EUROPE}
      zoom={point ? POINT_ZOOM : 3}
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
      <FollowPoint point={point} />
      { onChange ? <>
        <PickOnClick onChange={onChange} />
        { point && <Marker
          position={point}
          icon={PIN}
          draggable
          eventHandlers={{ dragend: e => { const { lat, lng } = e.target.getLatLng().wrap(); onChange(lat, lng) } }}
        /> }
      </> : point && <CircleMarker center={point} radius={9} className="ui-map__marker" /> }
    </MapContainer>
  );
}

const EUROPE: LatLngTuple = [ 50, 15 ];

const POINT_ZOOM = 10;

// CircleMarker не перетаскивается, а стандартная картинка Marker ломается в бандле — своя метка на CSS
const PIN = divIcon({ className: 'ui-map__pin', iconSize: [ 20, 20 ], iconAnchor: [ 10, 10 ] });

function PickOnClick({ onChange }: { onChange: (lat: number, lng: number) => void }){
  // wrap: за краем карты мир повторяется, и долгота уходит за ±180
  useMapEvents({ click: e => { const { lat, lng } = e.latlng.wrap(); onChange(lat, lng) } });

  return null;
}

function WheelOnFocus(){
  const map = useMapEvents({
    click: () => map.scrollWheelZoom.enable(),
    mouseout: () => map.scrollWheelZoom.disable()
  });

  return null;
}

// Координаты ввели в поля — карта едет к точке, зум не сбрасывается
function FollowPoint({ point }: { point: LatLngTuple | null }){
  const map = useMap();
  const [ lat, lng ] = point ?? [];

  useEffect(() => {
    if(lat === undefined || lng === undefined){
      return;
    }

    if(!map.getBounds().contains([ lat, lng ])){
      map.setView([ lat, lng ], Math.max(map.getZoom(), POINT_ZOOM));
    }
  }, [ map, lat, lng ]);

  return null;
}
