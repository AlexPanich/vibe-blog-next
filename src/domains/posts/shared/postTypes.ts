import type { PostType } from "@/database/schema";

export const POST_TYPE_LABELS: Record<PostType, string> = {
  simple:    'Обычный',
  translate: 'Перевод',
  travel:    'Путешествие'
}

// Вкладки ленты: undefined — «Все»
export const POST_TYPE_TABS: { type: PostType | undefined, label: string }[] = [
  { type: undefined,   label: 'Все' },
  { type: 'simple',    label: 'Обычные' },
  { type: 'translate', label: 'Переводы' },
  { type: 'travel',    label: 'Путешествия' }
]

export function osmUrl(lat: number, lng: number){
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=12/${lat}/${lng}`;
}
