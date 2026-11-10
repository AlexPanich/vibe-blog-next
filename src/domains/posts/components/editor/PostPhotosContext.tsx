'use client'

import 'client-only';
import type { PostGalleryResource } from "@/domains/posts/dto/postResources";
import { createContext } from "react";

export type PostPhotos = {
  // нет — пост ещё не сохранён, галереи нет
  images?: PostGalleryResource,
  // id фото, которые уже стоят в тексте
  used: number[]
}

/*
  Фото галереи для кнопки и окна выбора в редакторе (спека 38). Кнопку тулбара и ImageDialog
  MDXEditor рендерит сам, без props, — список доходит до них контекстом
*/
export const PostPhotosContext = createContext<PostPhotos>({ used: [] });
