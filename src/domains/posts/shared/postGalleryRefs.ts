/*
  Фото галереи внутри текста поста (спека 38): блок `![](gallery:<id>)`. Разбор — mdast, а не
  регулярка: картинка в блоке кода не картинка, reference-картинку регулярка не видит.
  Без 'server-only' / 'client-only' — нужно dto, actions, рендеру и редактору
*/
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import type { Image, Paragraph, Parent, PhrasingContent, Root, RootContent } from "mdast";

export const GALLERY_SRC = /^gallery:([1-9]\d*)$/;

export const FOREIGN_IMAGE_ERROR = 'Можно вставлять только фото из галереи поста';

export const REPEATED_IMAGE_ERROR = 'Это фото уже есть в тексте';

// 'gallery:12' → 12, иначе null
export function galleryImageId(src: string): number | null {
  const match = GALLERY_SRC.exec(src);

  if(!match){
    return null;
  }

  const id = Number(match[1]);

  return Number.isSafeInteger(id) ? id : null;
}

export function gallerySrc(id: number){
  return `gallery:${id}`;
}

// id фото в тексте по порядку, без повторов: мозаика, сетка выбора, обложка
export function galleryIdsInText(markdown: string): number[] {
  const ids: number[] = [];

  visit(parse(markdown), 'image', node => {
    const id = galleryImageId(node.url);

    if(id !== null && !ids.includes(id)){
      ids.push(id);
    }
  });

  return ids;
}

// Текст ошибки поля content или null: картинка не gallery: (в т.ч. reference) — чужая,
// id второй раз — повтор
export function contentImageProblem(markdown: string): string | null {
  const seen = new Set<number>();
  let problem: string | null = null;

  visit(parse(markdown), [ 'image', 'imageReference' ], node => {
    const id = node.type === 'image' ? galleryImageId((node as Image).url) : null;

    if(id === null){
      problem = FOREIGN_IMAGE_ERROR;

      return false;
    }

    if(seen.has(id)){
      problem = REPEATED_IMAGE_ERROR;

      return false;
    }

    seen.add(id);
  });

  return problem;
}

// Вырезает gallery:-картинки, для которых keep(id) === false. В абзаце нет ничего, кроме
// вырезаемых картинок, — уходит абзац целиком (на верхнем уровне — с одной пустой строкой после;
// в цитате и списке пустая строка остаётся, иначе следующий абзац уехал бы внутрь); иначе —
// только сами узлы. Режется с конца, чтобы offset'ы не съезжали. Нечего резать — та же строка
export function removeGalleryRefs(markdown: string, keep: (id: number) => boolean): string {
  const ranges: { start: number, end: number, block: boolean }[] = [];

  visit(parse(markdown), 'paragraph', (paragraph, _index, parent) => {
    const dropped = paragraph.children.filter(child => isDropped(child, keep));

    if(dropped.length === 0){
      return;
    }

    if(paragraph.children.every(child => isDropped(child, keep) || isBlank(child))){
      ranges.push({ ...offsets(paragraph), block: parent?.type === 'root' });

      return;
    }

    for(const node of dropped){
      ranges.push({ ...offsets(node), block: false });
    }
  });

  ranges.sort((a, b) => b.start - a.start);

  let result = markdown;

  for(const { start, end, block } of ranges){
    let before = result.slice(0, start);
    let after = result.slice(end);

    if(block){
      const blank = /^[ \t]*\r?\n[ \t]*\r?\n/.exec(after);

      if(blank){
        after = after.slice(blank[0].length);
      }
      else if(after.trim() === ''){
        before = before.replace(/\s+$/, '');
        after = '';
      }
    }

    result = before + after;
  }

  return result;
}

// remark-плагин рендера: абзац с gallery:-картинками разрезается на «текст до → фото → текст
// после» на уровне родителя (корень, цитата, пункт списка) — фото выводится блоком, а не
// внутри <p>. Пустые куски (пробелы, переносы) не создаются
export function remarkGalleryPhotos(){
  return (tree: Root) => {
    splitParagraphs(tree);
  };
}

function parse(markdown: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown);
}

function isGalleryImage(node: PhrasingContent | RootContent): node is Image {
  return node.type === 'image' && galleryImageId(node.url) !== null;
}

function isDropped(node: PhrasingContent, keep: (id: number) => boolean){
  return isGalleryImage(node) && !keep(galleryImageId(node.url)!);
}

function isBlank(node: PhrasingContent){
  return node.type === 'break' || (node.type === 'text' && node.value.trim() === '');
}

function offsets(node: Paragraph | PhrasingContent){
  return { start: node.position!.start.offset!, end: node.position!.end.offset! };
}

function splitParagraphs(parent: Parent){
  const children: RootContent[] = [];

  for(const child of parent.children as RootContent[]){
    if(child.type === 'paragraph' && child.children.some(isGalleryImage)){
      children.push(...splitParagraph(child));

      continue;
    }

    if('children' in child){
      splitParagraphs(child);
    }

    children.push(child);
  }

  parent.children = children as Parent['children'];
}

function splitParagraph(paragraph: Paragraph): RootContent[] {
  const result: RootContent[] = [];
  let chunk: PhrasingContent[] = [];

  const flush = () => {
    if(chunk.some(node => !isBlank(node))){
      result.push({ type: 'paragraph', children: chunk });
    }

    chunk = [];
  };

  for(const node of paragraph.children){
    if(isGalleryImage(node)){
      flush();
      result.push(node);
    }
    else{
      chunk.push(node);
    }
  }

  flush();

  return result;
}
