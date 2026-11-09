// Баннер автора: размеры есть только у обложки поста, у своей — нет (кадрирует CSS)
export type AuthorCover = { fileKey: string, width?: number, height?: number }

// Своя обложка главнее обложки последнего поста (спека 41, п. 3); нет обеих — плашка
export function authorCover(coverKey: string | null, postCover: AuthorCover | null | undefined): AuthorCover | null {
  return coverKey ? { fileKey: coverKey } : postCover ?? null;
}
