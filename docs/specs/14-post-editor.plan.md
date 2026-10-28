# 14. Визуальный редактор — план

Спека: [14-post-editor.md](14-post-editor.md).

## 1. Зависимость

`npm i @mdxeditor/editor@^4.3.2` — версия из next-2 (Next 16, React 19).

## 2. Компоненты (`domains/posts/components/editor/`)

- `PostEditorView.tsx` (client, сама библиотека): `MDXEditor` + плагины `headingsPlugin({
  allowedHeadingLevels: [1, 2] })`, `listsPlugin`, `quotePlugin`, `linkPlugin`,
  `linkDialogPlugin`, `thematicBreakPlugin`, `toolbarPlugin` с явным набором кнопок
  (`BoldItalicUnderlineToggles options={['Bold', 'Italic']}`, `BlockTypeSelect`,
  `ListsToggle options={['bullet', 'number']}`, `CreateLink`, `InsertThematicBreak`,
  `UndoRedo`). `contentEditableClassName="ui-prose ui-editor__content"`. Словарь
  `translation` из next-2, `toolbar.blockTypes.heading` по `level`: 1 — «Заголовок», 2 —
  «Подзаголовок». `onError` — наружу, для запасного поля. Центровка диалога ссылки — эффект
  из next-2 (MutationObserver + scroll/resize).
- `PostContentEditor.tsx` (client): `Input.Wrapper label="Текст" error`, внутри
  `dynamic(() => import('./PostEditorView'), { ssr: false, loading: заглушка })`. Состояние
  `broken`: после `onError` — предупреждение `.ui-note` и `PostMarkdownField`.
- `PostFormFields`: `PostMarkdownField` → `PostContentEditor`.
- `PostMarkdownField` остаётся как запасное поле; `label` у него становится необязательным
  (обёртку даёт `PostContentEditor`).

## 3. Стили (`layout.css`)

- `.ui-editor` — рамка и скругление как у полей Mantine, `focus-within` — цвет фокуса,
  панель с нижней границей и фоном `--paper-tint`; ошибка — красная рамка
  (`[data-error]`).
- `.ui-editor__content` — `min-height`, отступы, без outline. В поле заголовки уровня 1 и 2
  оформлены как `h2` / `h3` страницы: `.ui-editor__content h1 { стили h2 }`, `h2 { стили h3 }`.
- Переменные библиотеки `--baseBg`, `--baseBgSubtle`, `--baseBgHover`, `--baseBgActive`,
  `--baseBase`, `--basePageBg`, `--baseBorder`, `--baseBorderHover`, `--baseLine`,
  `--baseSolid`, `--baseText`, `--baseTextContrast` и акцентные — на токены; селекторы —
  `.mdxeditor.mdxeditor` и `body [class*="_popoverContent"]` / `_selectContainer` /
  `_dialogContent` / `_popupContainer`, тултип — отдельно (как в next-2).
- Наши токены уже переключаются темой — отдельной тёмной ветки не нужно.

## 4. Документы

- Спека 08: п. 5 помечен «пересмотрено спекой 14».
- `CLAUDE.md`: редактор только через `dynamic`, темизация через `--base*`.
- Спека 14 → `done`, отклонения, `README.md`.

## 5. Проверка

- `tsc`, `lint`, `build`.
- `bob`, новый пост: жирный, курсив, заголовок, подзаголовок, список, цитата, ссылка через
  диалог (диалог по центру поля), разделитель; сохранить → в БД markdown (`**`, `#`, `##`,
  `- `, `> `, `[…](…)`); на странице поста заголовок — `h2`, подзаголовок — `h3`.
- Правка: старый пост (простой текст) открывается в редакторе; черновик с `<div>` в тексте
  (через БД) — запасное поле с предупреждением, сохранение работает.
- Тёмная и светлая тема: панель, выпадающий список стиля, диалог ссылки, тултип — в цветах
  темы (скриншоты).
- Консоль без ошибок гидрации; страница поста не грузит чанк редактора.
- Регрессия: `markdown.cjs`, `tags.cjs`, `types.cjs` — они заполняют поле текста, локаторы
  поправить под редактор.
