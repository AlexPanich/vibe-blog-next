// Ширины webp-вариантов картинки поста, стороны квадрата аватара и ширины обложки профиля
export const IMAGE_WIDTHS = [ 1600, 800, 400 ] as const;

export const AVATAR_SIZES = [ 256, 64 ] as const;

export const COVER_WIDTHS = [ 1600, 800 ] as const;

export type ImageSize = (typeof IMAGE_WIDTHS)[number] | (typeof AVATAR_SIZES)[number];

export const UPLOAD_FILE_PATTERN = /^[a-f0-9-]{36}-(1600|800|400|256|64)\.webp$/;

export const ACCEPTED_IMAGE_TYPES = [ 'image/jpeg', 'image/png', 'image/webp' ];

export function imageUrl(key: string, size: ImageSize){
  return `/uploads/${key}-${size}.webp`;
}
