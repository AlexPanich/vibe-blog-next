export const TAG_TONES = [ 'coral', 'mint', 'sun', 'plum', 'plain' ] as const;

export type TagTone = typeof TAG_TONES[number];

/*
  Цвет чипа рубрики (спека 30): по id, чтобы рубрика была одного цвета везде —
  в фильтре и в карточках авторов
*/
export function tagTone(tagId: number): TagTone {
  return TAG_TONES[tagId % TAG_TONES.length];
}
