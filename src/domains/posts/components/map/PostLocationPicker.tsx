'use client'

import 'client-only';
import dynamic from "next/dynamic";

const PostMapView = dynamic(() => import('@/domains/posts/components/map/PostMapView'), {
  ssr: false,
  loading: () => <div className="ui-map ui-map--loading" />
});

type PostLocationPickerProps = {
  lat: number | string,
  lng: number | string,
  onChange: (lat: number, lng: number) => void
}

// Выбор точки в форме: клик ставит метку, метку можно тащить. Поля координат — снаружи.
export default function PostLocationPicker({ lat, lng, onChange }: PostLocationPickerProps) {
  return <PostMapView lat={coordinate(lat)} lng={coordinate(lng)} onChange={(lat, lng) => onChange(round(lat), round(lng))} />
}

// В полях бывает '' и недописанное число — карта видит только готовое
function coordinate(value: number | string){
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round(value: number){
  return Math.round(value * 1e6) / 1e6;
}
