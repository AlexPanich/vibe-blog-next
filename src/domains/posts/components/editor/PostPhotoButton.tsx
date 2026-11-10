'use client'

import 'client-only';
import { activeEditor$, ButtonWithTooltip, openNewImageDialog$, useCellValue, usePublisher } from "@mdxeditor/editor";
import { IconPhoto } from "@tabler/icons-react";
import { use } from "react";
import { PostPhotosContext } from "@/domains/posts/components/editor/PostPhotosContext";

/*
  «Фото из галереи» в тулбаре редактора (спека 38): открывает окно выбора PostPhotoPicker.
  Без галереи кнопка неактивна, подсказка говорит, что сделать
*/
export default function PostPhotoButton() {
  const { images } = use(PostPhotosContext);
  const editor = useCellValue(activeEditor$);
  const open = usePublisher(openNewImageDialog$);
  const title = !images
    ? 'Сначала сохраните черновик и добавьте фото'
    : images.length === 0 ? 'Сначала добавьте фото в галерею ниже' : 'Фото из галереи';

  return (
    <ButtonWithTooltip title={title} aria-label="Фото из галереи" disabled={!images?.length || !editor} onClick={() => open()}>
      <IconPhoto size={20} stroke={1.8} />
    </ButtonWithTooltip>
  );
}
