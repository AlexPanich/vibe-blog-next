const TONES = [ 'coral', 'sun', 'mint', 'plum' ] as const;

// Цвет плашки вместо обложки автора — один на баннере, в карточке и в превью профиля
export function authorTone(authorId: number){
  return TONES[authorId % TONES.length];
}
