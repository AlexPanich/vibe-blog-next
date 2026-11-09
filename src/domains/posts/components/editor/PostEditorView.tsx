'use client'

import 'client-only';
import '@mdxeditor/editor/style.css';
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  MDXEditor,
  quotePlugin,
  Separator,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo
} from "@mdxeditor/editor";
import { useEffect, useRef } from "react";

export type PostEditorViewProps = {
  value: string,
  onChange: (markdown: string) => void,
  // Редактор не разобрал markdown — показать запасное поле
  onError: () => void
}

/*
  Сама библиотека. Трогает window при импорте, поэтому грузится только через
  dynamic(..., { ssr: false }) из PostContentEditor. Значение — строка markdown, та же,
  что в колонке content
*/
export default function PostEditorView({ value, onChange, onError }: PostEditorViewProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useCenteredLinkDialog(rootRef);

  return (
    <div ref={rootRef} className="ui-editor">
      <MDXEditor
        markdown={value}
        // Нормализация markdown при монтировании — не правка: форма не должна стать «грязной» (спека 49)
        onChange={(markdown, initialNormalize) => initialNormalize || onChange(markdown)}
        onError={onError}
        contentEditableClassName="ui-prose ui-editor__content"
        translation={translate}
        plugins={[
          toolbarPlugin({
            toolbarContents: () => <>
              <BoldItalicUnderlineToggles options={[ 'Bold', 'Italic' ]} />
              <BlockTypeSelect />
              <ListsToggle options={[ 'bullet', 'number' ]} />
              <CreateLink />
              <Separator />
              <InsertThematicBreak />
              <UndoRedo />
            </>
          }),
          // Уровни 1 и 2: рендер сдвигает их в h2 / h3 — то же, что видно в поле
          headingsPlugin({ allowedHeadingLevels: [ 1, 2 ] }),
          // Без отдельных плагинов кнопки нажимаются и ничего не делают
          listsPlugin(),
          quotePlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          thematicBreakPlugin()
        ]}
      />
    </div>
  );
}

// Ключи — как у библиотеки; недостающие останутся английскими
const RU: Record<string, string> = {
  'contentArea.editableMarkdown': 'Текст',
  'toolbar.bold': 'Жирный',
  'toolbar.italic': 'Курсив',
  'toolbar.removeBold': 'Снять жирный',
  'toolbar.removeItalic': 'Снять курсив',
  'toolbar.toggleGroup': 'Списки',
  'toolbar.bulletedList': 'Маркированный список',
  'toolbar.numberedList': 'Нумерованный список',
  'toolbar.link': 'Ссылка',
  'toolbar.thematicBreak': 'Разделитель',
  'toolbar.undo': 'Отменить',
  'toolbar.redo': 'Повторить',
  'toolbar.blockTypeSelect.placeholder': 'Стиль абзаца',
  'toolbar.blockTypeSelect.selectBlockTypeTooltip': 'Выбрать стиль абзаца',
  'toolbar.blockTypes.paragraph': 'Обычный текст',
  'toolbar.blockTypes.quote': 'Цитата',
  'createLink.text': 'Текст ссылки',
  'createLink.url': 'Адрес',
  'createLink.urlPlaceholder': 'https://example.com',
  'createLink.title': 'Подсказка при наведении',
  'createLink.titleTooltip': 'Необязательно. Текст, который покажут при наведении на ссылку.',
  'createLink.saveTooltip': 'Вставить',
  'createLink.cancelTooltip': 'Отмена',
  'dialogControls.save': 'Вставить',
  'dialogControls.cancel': 'Отмена',
  'dialog.close': 'Закрыть',
  'linkPreview.open': 'Открыть ссылку',
  'linkPreview.edit': 'Изменить ссылку',
  'linkPreview.copyToClipboard': 'Скопировать',
  'linkPreview.copied': 'Скопировано',
  'linkPreview.remove': 'Убрать ссылку'
}

const HEADING_LABELS: Record<number, string> = { 1: 'Заголовок', 2: 'Подзаголовок' }

function translate(key: string, defaultValue: string, values?: Record<string, unknown>): string {
  if(key === 'toolbar.blockTypes.heading'){
    return HEADING_LABELS[Number(values?.level)] ?? defaultValue;
  }

  return (RU[key] ?? defaultValue).replace(/\{\{(\w+)\}\}/g, (match, name: string) => values && name in values ? String(values[name]) : match);
}

/*
  Диалог ссылки — по центру поля, а не вплотную к кнопке (решение next-2). Radix ставит
  позицию inline-стилем на безымянную обёртку в портале, CSS её не перебьёт — двигаем сами
  и догоняем Radix на появлении узла, прокрутке и ресайзе
*/
function useCenteredLinkDialog(rootRef: React.RefObject<HTMLDivElement | null>){
  useEffect(() => {
    const place = () => {
      const content = document.querySelector<HTMLElement>("[class*='_linkDialogPopoverContent']");
      const wrapper = content?.parentElement;
      const field = rootRef.current?.querySelector('[contenteditable="true"]');

      if(!content || !wrapper || !field || wrapper.style.position !== 'fixed'){
        return;
      }

      const rect = field.getBoundingClientRect();
      const { width, height } = content.getBoundingClientRect();
      wrapper.style.left = `${rect.left + rect.width / 2 - width / 2}px`;
      wrapper.style.top = `${rect.top + rect.height / 2 - height / 2}px`;
      wrapper.style.transform = 'none';
    };

    // Radix проставляет позицию уже после вставки узла — нужен ещё кадр
    const schedule = () => {
      place();
      requestAnimationFrame(place);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [ rootRef ]);
}
