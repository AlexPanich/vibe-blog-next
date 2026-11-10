# 38. Фото внутри текста поста — план

Спека — `38-inline-photos.md` (решения 1–12). Миграций нет. Lifecycle `post.md`, раздел
«Галерея» — абзац (шаг 10). Образцы: рендер — `PostMarkdown.tsx`; редактор и его плагины —
`PostEditorView.tsx` (диалог ссылки, переводы); сетка миниатюр — `PostGalleryManager.tsx`;
транзакция удаления фото — `deletePostImageAction`; сид — `scripts/seed-demo/fill.ts`.

## Решения плана (в спеке не было или уточнено)

1. **Разбор — mdast, а не регулярка.** Регулярка ловит `![](gallery:1)` и внутри блока кода,
   и в inline-коде, и не видит reference-картинок `![x][ref]`. Парсер — `unified` +
   `remark-parse` + `remark-gfm` (те же версии, что уже стоят под `react-markdown`, в бандл
   ничего нового не попадает). Вычистка режет текст **по offset'ам** узлов
   (`node.position.start/end.offset`) — остальная разметка не переформатируется.
2. **Блок «отдельным абзацем» — гарантирует рендер, а не хранение.** Lexical-узел картинки
   inline: автор может дописать текст в тот же абзац, в запасном поле — тоже. Хранимый текст
   не нормализуем; remark-плагин рендера (`remarkGalleryPhotos`) разрезает абзац с фото на
   «текст до → фото → текст после» на том же уровне (работает и внутри цитаты/списка). Фото
   всегда выводится блоком `<figure>`, невалидного `<figure>` внутри `<p>` нет.
3. **`urlTransform`.** Штатный `defaultUrlTransform` react-markdown вычищает неизвестную схему
   `gallery:` — `src` пришёл бы пустым. Свой: `key === 'src'` и адрес по шаблону `gallery:<id>`
   → как есть, иначе `defaultUrlTransform(url)`.
4. **Обложка на странице поста выводится** (спека 30: `ui-post__cover` над текстом), п. 10
   спеки устарел. Чтобы не было дубля: если обложка поста (`coverImageId ?? images[0].id`)
   стоит в тексте — **верхнюю обложку не показываем**, фото остаётся в тексте с подписью.
   Так выглядит пост без фото (кнопки «назад» на обложке у телефона тогда нет — как и сейчас
   у поста без фото). То же правило — в `PostReviewPreview`. Карточки, OG, RSS — без изменений.
   Дописать отклонение в спеку (шаг 10).
5. **Вставка в редакторе — новым абзацем после текущего блока**, а не в позицию курсора
   (штатный `insertImage$` вставляет в середину абзаца). Через `activeEditor$` +
   `lexical` (MDXEditor реэкспортирует namespace `lexical` и `$createImageNode` — отдельный
   пакет не нужен). Нет выделения — в конец. Текущий блок — пустой абзац — заменяется фото.
6. **Список фото в редакторе — через React context** (`PostPhotosContext`): `ImageDialog` и
   содержимое тулбара MDXEditor — компоненты без props, рендерятся внутри дерева
   `<MDXEditor>`, контекст до них доходит. `imagePreviewHandler` читает список из `useRef`
   (плагин инициализируется один раз, свежий список ему не передать).
7. **Заглушки в редакторе** — `imagePreviewHandler` возвращает адрес: для неизвестного id —
   SVG data-URL с текстом «Фото удалено», для адреса не `gallery:` — «Картинка не из галереи».
   Заглушка в поле остаётся до повторного открытия редактора: сохранение вычищает id молча
   (реш. 7 спеки), форму после сохранения не перезагружаем.
8. **Вставка файлов мимо галереи закрыта**: `imageUploadHandler` не задаём. Paste картинки
   без текста библиотека тогда глотает сама; drop файла — проверить на шаге проверки (п. 11),
   если браузер вставит `data:` — валидация сохранения всё равно отклонит.
9. **Проверки формата — в zod, вычистка — в action.** `superRefine` на `content` в
   `postOwnCreateDto` (чужой адрес, повтор) — ошибки поля приходят как обычные
   `validationErrors`. Сверка с галереей поста — в `createPostAction` (галереи нет — все
   `gallery:` выбрасываются) и `updatePostAction` (до транзакции, по `postImages` поста).
10. **Повтор проверяется до вычистки**: дважды вставленное удалённое фото тоже даст ошибку.
    Редкий случай, не обходим.
11. **Подпись и alt.** `<figcaption>` — `caption`, нет подписи — нет `figcaption`; `alt` у
    `<img>` — `caption ?? ''`. `alt` из markdown игнорируется (реш. 2 спеки).

## Шаги

### 1. Зависимости
`npm i unified@11.0.5 remark-parse@11.0.0 unist-util-visit@5.2.0` и
`npm i -D @types/mdast@4.0.4` — версии уже в дереве под `react-markdown`, лок не должен
притянуть вторые копии (проверить `npm ls unified remark-parse`).

### 2. Разбор ссылок — `src/domains/posts/shared/postGalleryRefs.ts`
Без `server-only` и `client-only`: нужен dto, actions, рендеру и редактору.

```ts
export const GALLERY_SRC = /^gallery:([1-9]\d*)$/;

export const FOREIGN_IMAGE_ERROR = 'Можно вставлять только фото из галереи поста';

export const REPEATED_IMAGE_ERROR = 'Это фото уже есть в тексте';

// 'gallery:12' → 12, иначе null
export function galleryImageId(src: string): number | null

export function gallerySrc(id: number): string

// id фото в тексте по порядку, без повторов: мозаика, сетка выбора, обложка
export function galleryIdsInText(markdown: string): number[]

// Текст ошибки поля content или null: картинка не gallery: (в т.ч. imageReference) — FOREIGN,
// id второй раз — REPEATED
export function contentImageProblem(markdown: string): string | null

// Вырезает gallery:-картинки, для которых keep(id) === false. Картинка — единственное
// содержимое абзаца → уходит абзац целиком вместе с одной пустой строкой после; иначе — только
// сам узел. Резать с конца, чтобы offset'ы не съезжали. Нечего резать — та же строка
export function removeGalleryRefs(markdown: string, keep: (id: number) => boolean): string

// remark-плагин рендера (реш. 2 плана): абзац с gallery:-картинками → абзацы текста и узлы
// image на уровне родителя; пустые куски (одни пробелы / break) не создавать
export function remarkGalleryPhotos(): (tree: Root) => void
```

Внутренний помощник ниже экспортов — `parse(markdown)`:
`unified().use(remarkParse).use(remarkGfm).parse(markdown)`, обход — `visit` по `image` и
`imageReference`. Узлы в `code` / `inlineCode` в дерево как картинки не попадают — это и есть
причина mdast.

Проверка руками (`npx tsx -e`): `removeGalleryRefs('a\n\n![](gallery:1)\n\nb', id => id !== 1)`
→ `'a\n\nb'`; `'текст ![](gallery:1) ещё'` → `'текст  ещё'`; `` '`![](gallery:1)`' `` не
трогается; `contentImageProblem('![x](https://a.b/c.png)')` → FOREIGN.

### 3. DTO — `domains/posts/dto/postRequests.ts`
В `postOwnCreateDto`:
```ts
content: z.string().min(5).superRefine((value, ctx) => {
  const problem = contentImageProblem(value);

  if(problem){
    ctx.addIssue({ code: 'custom', message: problem });
  }
}),
```
`postEditorDto` / `postUpdateDto` наследуют.

### 4. Actions
- `postActions.ts`:
  - `createPostAction` — перед транзакцией
    `fields.content = removeGalleryRefs(fields.content, () => false)`.
  - `updatePostAction` — до транзакции загрузить id фото поста
    (`db.select({ id: postImages.id }).from(postImages).where(eq(postImages.postId, post.id))`)
    в `Set`, `content = removeGalleryRefs(content, id => ids.has(id))`. Внутри транзакции
    ничего не меняется: фото удаляют только в `draft`, а `updatedAt`-версия ловит гонку
    (удаление фото двигает `updatedAt` через `touchDraft`).
- `postImageActions.ts`, `deletePostImageAction` — в транзакции после `touchDraft`: прочитать
  `posts.content`, `removeGalleryRefs(content, id => id !== imageId)`, изменилось — `UPDATE`.
  Дописать в комментарий над action: «блоки фото вычищаются из текста (спека 38)».

### 5. Рендер — `PostMarkdown.tsx` и CSS
Новый необязательный prop:
```ts
photos?: { postId: number, images: PostGalleryResource, linked?: boolean }
```
- `disallowedElements={[ 'img' ]}` убрать; `remarkPlugins={[ remarkGfm, remarkGalleryPhotos ]}`;
  `urlTransform` — реш. 3.
- `components.img` (через замыкание по `photos` — `COMPONENTS` становится функцией
  `components(photos)` или `useMemo` не нужен: компонент без хуков, собрать объект в теле):
  id не из `photos.images` или `photos` не передан → `null`; иначе
  ```tsx
  <figure className="ui-post-photo">
    {/* linked — обёртка Link на /posts/{postId}/images/{id}, как в PostGallery */}
    <img src={imageUrl(key, 1600)} srcSet="… 800w, … 1600w"
         sizes="(max-width: 42.5rem) 100vw, 42.5rem" width height alt={caption ?? ''} loading="lazy" />
    { caption && <figcaption>{ caption }</figcaption> }
  </figure>
  ```
  42.5rem — `--measure` из `tokens.css`.
- Комментарий файла: «картинок нет» → «только фото галереи поста (спека 38)».
- `layout.css`, рядом с `.ui-prose`: `.ui-post-photo` (отступы как у абзацев, `img` —
  `width: 100%; height: auto; border-radius` из токенов, `figcaption` — мелкий приглушённый
  текст по образцу подписи на странице фото `PostPhotoStage`). Ссылка вокруг — без
  подчёркивания, фокус-рамка видна.

### 6. Страницы: мозаика и обложка
Во всех трёх местах: `const inline = galleryIdsInText(post.content)`,
`PostMarkdown photos={{ postId, images, linked? }}`, мозаика —
`images.filter(image => !inline.includes(image.id))`.
- `app/(public)/posts/[id]/page.tsx` — `linked`; верхняя обложка — реш. 4: id обложки
  `post.coverImageId ?? images[0]?.id`, стоит в `inline` → `cover` не выводим.
- `app/office/posts/[id]/page.tsx` — `getPostImages` вынести из JSX в переменную, без `linked`.
- `PostReviewPreview.tsx` — без `linked`; верхняя обложка — реш. 4; плашка «В посте N фото»
  считает все фото, как сейчас.
- `PostPhotoStage` / страница фото — без изменений (листание по всей галерее).
- Правило верхней обложки нужно в двух местах — функция
  `inlineCover(post, images, inline): boolean` («обложка стоит в тексте») рядом с `coverOf` в
  `shared/postImages.ts` (`server-only` не мешает: обе страницы серверные).

### 7. Редактор
**Прокидка списка.** `PostEditorForm` получает `images?: StrictResource<…, PostGalleryResource>`
(edit page — `resource(postGalleryResource, images)`, create — не передаёт) →
`PostFormFields` (prop `images`) → `PostContentEditor` → `PostEditorView` и в превью
`PostMarkdown photos={{ postId, images }}` (нужен и `postId` — прокинуть рядом; на create
`images` нет — превью без фото). `router.refresh()` после действий галереи уже приносит
свежий список (revalidatePath в `postImageActions`).

**`PostEditorView.tsx`:**
- props `postId?: number`, `images?: PostGalleryResource`; обернуть `<MDXEditor>` в
  `<PostPhotosContext value={{ images, used: galleryIdsInText(value) }}>`.
  `value` — текущая строка формы (prop уже приходит при каждом onChange).
- В `plugins` добавить:
  ```ts
  imagePlugin({
    imagePreviewHandler: async src => previewSrc(src, imagesRef.current),
    ImageDialog: PostPhotoPicker,
    disableImageResize: true,
    disableImageSettingsButton: true
  })
  ```
  `previewSrc` — `imageUrl(fileKey, 800)` или заглушка (реш. 7), внутренняя функция внизу файла.
- В тулбар после `<CreateLink />` — `<PostPhotoButton />`.
- Переводы в `RU`: `'imageEditor.deleteImage': 'Убрать фото из текста'`,
  `'imageEditor.editImage': 'Настройки'` (кнопка скрыта, но ключ пусть будет).

**Новые файлы в `domains/posts/components/editor/`** (все `'use client'` + `client-only`,
грузятся только из `PostEditorView`, значит уже внутри `dynamic(..., { ssr: false })`):
- `PostPhotosContext.tsx` — `createContext<{ images?: PostGalleryResource, used: number[] }>`.
- `PostPhotoButton.tsx` — кнопка тулбара (иконка `IconPhoto`, вид как у соседних кнопок
  MDXEditor — `ButtonWithTooltip` из библиотеки). `usePublisher(openNewImageDialog$)`.
  Нет `images` или он пустой — `disabled`, подсказка: без поста — «Сначала сохраните черновик
  и добавьте фото», пустая галерея — «Сначала добавьте фото в галерею ниже».
- `PostPhotoPicker.tsx` — `ImageDialog` библиотеки. `useCellValue(imageDialogState$)`:
  рендер только при `type === 'new'`, иначе `null`. Mantine `Modal` «Фото из галереи»,
  закрытие — `usePublisher(closeImageDialog$)`. Сетка кнопок-миниатюр (`imageUrl(…, 400)`,
  подпись под миниатюрой обрезана в строку). Фото из `used` — `disabled`, приглушены, с
  подписью «Уже в тексте». Клик — вставка (реш. 5):
  ```ts
  editor.update(() => {
    const paragraph = lexical.$createParagraphNode().append($createImageNode({ src: gallerySrc(id), altText: '', title: '' }));
    const selection = lexical.$getSelection();
    const block = lexical.$isRangeSelection(selection) ? selection.anchor.getNode().getTopLevelElement() : null;
    // пустой абзац — заменить, иначе — после блока; без выделения — в конец
  });
  ```
  `editor` — `useCellValue(activeEditor$)` (на старте `null` — кнопки неактивны). После
  вставки — закрыть окно.
- CSS в `layout.css`: `.ui-photo-picker` (сетка `repeat(auto-fill, minmax(8rem, 1fr))`, плитки
  по образцу `.ui-gallery--manage`); картинки в поле редактора — `.ui-editor__content img`
  `max-width: 100%; height: auto`. Модалка Mantine — в своём портале, переменные `--base*`
  её не касаются.

**Если `imagePlugin` не заработает малой кровью** (запасной путь спеки, реш. 6): плагин не
подключать, в `PostContentEditor` над полем — кнопка «Фото из галереи», открывающая тот же
`PostPhotoPicker`-подобный `Modal` (без Lexical), выбор дописывает в конец значения
`\n\n![](gallery:<id>)\n`. Картинки в тексте тогда ломают MDXEditor (`onError`) → поле
`PostMarkdownField` — это и есть запасной режим. Решение о переходе — записать в спеку.

### 8. Запасное поле — `PostMarkdownField.tsx`
Принимает `postId?` и `images?`, превью — `PostMarkdown photos={…}`. `PostContentEditor`
передаёт их и в ветке `broken`.

### 9. Демо — `scripts/seed-demo/`
- В `content` 2–3 опубликованных постов (кандидаты — `posts-anya.ts`: Дагестан, Териберка,
  Чуйский тракт; у каждого ≥ 2 фото) поставить маркеры `![](gallery:#2)` отдельным абзацем —
  номер 1-based в `post.photos`. Фото №1 (обложка по умолчанию) не ставить: верхняя обложка
  должна остаться у демо. В одном посте — два фото, в одном — все фото поста в тексте (видно
  «мозаики нет»), остальные посты — без маркеров.
- `fill.ts` — после записи `images` поста:
  ```ts
  const content = post.content.replace(/\(gallery:#(\d+)\)/g, (_, n) => `(gallery:${images[Number(n) - 1]})`);

  if(content !== post.content){
    tx.update(schema.posts).set({ content }).where(eq(schema.posts.id, id)).run();
  }
  ```
  Маркер на несуществующий номер — `throw` (опечатка в демо видна сразу). Импорты — как в
  файле (относительные, без `@/`).
- Прогнать `npm run db:seed-dev`.

### 10. Документы
- `docs/lifecycles/post.md`, «Галерея» — абзац: фото галереи можно поставить в текст
  (`![](gallery:<id>)`, один раз), подпись — из галереи; удаление фото вычищает его из текста;
  в мозаике — только фото не из текста; обложка в тексте — верхней обложки на странице нет.
- `38-inline-photos.md`: статус «план готов»; в конец — «Отклонения»: п. 10 (обложка на
  странице есть → реш. 4 плана), абзац не нормализуется при хранении (реш. 2 плана).
- `README.md` — статус 38 → `план`.

### 11. Проверка
- `npx tsc --noEmit`, `npm run lint`, `npm run build` (новые зависимости, `client-only` в
  новых файлах).
- Сценарии для фазы проверки (`app-run`, `bob@example.com`):
  1. Новый пост — кнопка «Фото из галереи» неактивна с подсказкой.
  2. Черновик с 3 фото: вставить 2 фото между абзацами → в сетке они серые; превью
     показывает фото с подписями; сохранить → в `content` два блока `![](gallery:N)`.
  3. Поменять подпись в галерее → превью и страница поста показывают новую.
  4. Удалить фото, стоящее в тексте → в БД блок исчез, в поле редактора — «Фото удалено»;
     «Сохранить» — блок не вернулся.
  5. Запасное поле: вписать `![](https://example.com/a.png)` → ошибка поля «Можно вставлять
     только фото из галереи поста»; один id дважды → «Это фото уже есть в тексте».
  6. Перетащить файл картинки в поле редактора — ничего не вставилось (реш. 8 плана).
  7. Опубликованный демо-пост: фото посреди текста, клик ведёт на страницу фото, листание —
     по всей галерее; мозаика без фото из текста; пост «все фото в тексте» — без мозаики.
  8. Выдержка в карточке и RSS — без следов `gallery:`.
  9. Модерация (`some@example.com`): превью поста с фото в тексте, мозаика без них.
  10. Телефон (375px): фото во всю ширину колонки, подпись читается, сетка выбора — 2 колонки.
