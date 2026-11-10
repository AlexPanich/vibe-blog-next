'use client'

import 'client-only';
import { $createImageNode, activeEditor$, closeImageDialog$, imageDialogState$, lexical, useCellValue, usePublisher } from "@mdxeditor/editor";
import { Modal } from "@mantine/core";
import { use } from "react";
import { imageUrl } from "@/core/imageUrl";
import { gallerySrc } from "@/domains/posts/shared/postGalleryRefs";
import { PostPhotosContext } from "@/domains/posts/components/editor/PostPhotosContext";

/*
  Окно «Фото из галереи» вместо ImageDialog библиотеки (спека 38): сетка миниатюр, клик ставит
  фото отдельным абзацем после текущего блока. Фото, которые уже в тексте, не выбираются.
  Окно правки картинки не нужно — настройки картинки выключены
*/
export default function PostPhotoPicker() {
  const state = useCellValue(imageDialogState$);
  const editor = useCellValue(activeEditor$);
  const close = usePublisher(closeImageDialog$);
  const { images = [], used } = use(PostPhotosContext);

  if(state.type !== 'new'){
    return null;
  }

  const insert = (id: number) => {
    editor?.update(() => insertPhotoBlock(gallerySrc(id)));
    close();
  };

  return (
    <Modal opened onClose={() => close()} title="Фото из галереи" size="lg" centered>
      <div className="ui-photo-picker">
        { images.map(image => {
          const inText = used.includes(image.id);

          return (
            <button
              key={image.id}
              type="button"
              className="ui-photo-picker__item"
              disabled={inText || !editor}
              onClick={() => insert(image.id)}
            >
              <img src={imageUrl(image.fileKey, 400)} width={image.width} height={image.height} alt="" />
              <span className="ui-photo-picker__caption">{ inText ? 'Уже в тексте' : image.caption || 'Без подписи' }</span>
            </button>
          );
        }) }
      </div>
    </Modal>
  );
}

// Новый абзац с фото после верхнего блока, где стоит курсор; пустой абзац заменяется; без выделения — в конец
function insertPhotoBlock(src: string){
  const paragraph = lexical.$createParagraphNode().append($createImageNode({ src, altText: '', title: '' }));
  const selection = lexical.$getSelection();
  const block = lexical.$isRangeSelection(selection) ? selection.anchor.getNode().getTopLevelElement() : null;

  if(!block){
    lexical.$getRoot().append(paragraph);
  }
  else if(lexical.$isParagraphNode(block) && block.getTextContent().trim() === '' && block.getChildrenSize() === 0){
    block.replace(paragraph);
  }
  else{
    block.insertAfter(paragraph);
  }

  paragraph.selectEnd();
}
