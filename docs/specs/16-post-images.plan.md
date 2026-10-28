# 16. Картинки поста — план

Спека: [16-post-images.md](16-post-images.md). Порядок: хранилище → схема → загрузка и
управление в кабинете → показ → страница картинки и её комментарии → документы →
проверка. Хранилище и обработка общие со спекой 17 — пишутся так, чтобы аватары их
переиспользовали.

## 1. Конфиг и хранилище

- `config/uploads.ts`: `uploadsDir` (`storage/uploads`), `MAX_UPLOAD_BYTES = 5 МБ`,
  `MAX_PIXELS = 40e6`, `IMAGE_WIDTHS = [1600, 800, 400]`, `AVATAR_SIZES = [256, 64]`.
- `next.config.ts`: `experimental.serverActions.bodySizeLimit: '6mb'`;
  `sharp` — в `serverExternalPackages` не нужен (Next держит его внешним сам), но
  прямой зависимостью в `package.json` — да (сейчас приходит транзитивно от Next).
- `globals/uploads.ts` (server): `ensureUploadsDir()`, `writeVariant(key, suffix, buffer)`,
  `removeFiles(key, suffixes)` — без падения на отсутствующем файле.
- `shared/images.ts` (server):
  - `readImage(file: File)` — размер ≤ 5 МБ → `sharp(buffer, { limitInputPixels: MAX_PIXELS })
    .metadata()`, формат ∈ `jpeg | png | webp`, иначе ошибка поля «Нужна картинка jpeg,
    png или webp»;
  - `saveImageVariants(buffer, widths)` → `{ key, width, height }`: `rotate()` (EXIF-
    ориентация), `resize({ width|height по длинной стороне, withoutEnlargement })`,
    `webp({ quality: 82 })`, метаданные по умолчанию не пишутся — EXIF снят;
  - `saveSquareVariants(buffer, sizes)` для аватаров (`fit: 'cover'`, центр);
  - `imageUrl(key, size)` — без маркеров, общий для клиента: `/uploads/${key}-${size}.webp`.
- `app/uploads/[file]/route.ts`: имя по regex `^[a-f0-9-]{36}-(1600|800|400|256|64)\.webp$`,
  иначе 404; `readFile` → `200 image/webp`, `Cache-Control: public, max-age=31536000,
  immutable` (ключ меняется вместе с файлом); нет файла — 404.
- `rateLimiters.imageUpload` — 60 в час по `userId`.

## 2. Схема (`0011_post_images`)

- `post_images`: `id`, `postId`, `fileKey` (unique), `width`, `height`, `caption`,
  `createdAt`; индекс `post_images_post_idx`.
- `posts.cover_image_id integer` и `comments.image_id integer` + индекс — `ADD COLUMN`.
  Проверить, что drizzle-kit не пересобирает `posts`/`comments` (FK на них — пересборка
  упадёт, см. `CLAUDE.md`). Бэкап → `migrate` → `touch next.config.ts`.
- Relations: `posts.images`, `postImages.post`.

## 3. Домен `posts` — галерея

- `policy.ts`: `editPostImages(user, post)` = `editPost` (свой или admin, `draft`).
- `dto/postImageRequests.ts`: `postImageUploadDto { file: z.instanceof(File) }`,
  `postImageCaptionDto { caption: trim, ≤ 200 }`.
- `dto/postResources.ts`: `postImageResource { id, fileKey, width, height, caption,
  commentsCount }`, `postGalleryResource` (массив); `postResource` += `cover: { fileKey,
  width, height } | null` для карточки.
- `shared/postImages.ts` (server): `getPostImages(postId)` (по `createdAt, id`, со
  счётчиком неудалённых комментариев), `coverOf(post, images)`, `coversFor(postIds)` —
  одним запросом для ленты.
- `actions/postImageActions.ts`:
  - `uploadPostImageAction(postId)` — `breakIfCant(editPostImages)`, `consumeOrFail`,
    `readImage` → `saveImageVariants` → транзакция: пост `draft`, картинок < 10 → insert;
    отказ → `removeFiles` и 409 / ошибка поля;
  - `updatePostImageCaptionAction(imageId)`, `setPostCoverAction(imageId)` — пост `draft`
    в том же запросе;
  - `deletePostImageAction(imageId)` — транзакция: пост `draft`; удалить реакции
    комментариев картинки → комментарии → картинку (журнал скрытий остаётся);
    если была обложкой — `cover_image_id = null`; после — `removeFiles`;
  - все — `revalidatePath` страниц кабинета.
- Компоненты:
  - `PostGalleryManager` (client, в кабинете): сетка, зона загрузки (кнопка + drag-and-
    drop), очередь файлов с прогрессом и ошибкой у каждого, проверка размера и типа до
    отправки, подпись в строке, «Сделать обложкой» (метка «Обложка»), «Удалить» с
    подтверждением «Удалятся и N комментариев» (`Modal`, как у рубрик);
  - `PostGallery` (server-safe): сетка превью 400 со ссылками и счётчиком комментариев;
    проп `linked` — в кабинете и модерации без ссылок на публичную страницу;
  - `PostCover` — в `PostCard`, `<img>` 800 с `width/height`, `object-fit: cover`,
    `loading="lazy"`.
- Страницы: `office/posts/[id]/edit` — `PostGalleryManager` под формой;
  `office/posts/create` — подсказка; `office/posts/[id]`, `office/moderation/posts/[id]`,
  публичная `posts/[id]` — `PostGallery`; лента и страница автора — обложка в карточках
  (`coversFor`); `opengraph-image.tsx` — обложка 800 из файла (data URL) слева от текста
  или фоном, если есть.

## 4. Страница картинки и комментарии

- `comments`: `loadComments(postId, imageId | null)`; `createCommentAction` получает
  `imageId` вторым bind-аргументом, проверяет, что картинка принадлежит посту; родитель —
  та же ветка (тот же `imageId`); `loadCommentViewerAction` — тоже по `(postId, imageId)`.
  Счётчик и блок под постом — `image_id IS NULL`. `revalidatePath` — и страница картинки.
- `app/(public)/posts/[id]/images/[imageId]/page.tsx`: `getPublishedPost`, картинка этого
  поста или 404; `generateMetadata` — подпись / «Фото N — <заголовок>»; картинка 1600
  (`<img srcset>` 800/1600), подпись, «← К посту», «предыдущая / следующая» по порядку,
  `CommentsBlock` с `imageId`.
- «Мои комментарии»: ссылка на `/posts/[id]/images/[imageId]#comment-…`, подпись «к фото».

## 5. Документы

- `post.md` — «Галерея»: часть содержимого, только в `draft`, обложка; удаление картинки
  удаляет её комментарии.
- `comment.md` — комментарии к картинке: та же модель, своя ветка.
- `CLAUDE.md` — хранилище `storage/uploads`, раздача через route handler, лимит тела action.
- Спека → `done`, отклонения, `README.md`.

## 6. Проверка (`e2e/images.cjs`, фикстуры генерирует `sharp` в scratchpad)

- `bob`, черновик: загрузка 3 jpeg/png сразу — прогресс, превью; 6 МБ и `.gif` — ошибка
  на клиенте без запроса; `.txt`, переименованный в `.png`, мимо клиента (прямой вызов) —
  ошибка сервера; 11-я картинка — отказ.
- EXIF: jpeg с GPS → в webp-варианте метаданных нет; ориентация применена.
- Подпись, обложка, удаление с подтверждением; файлы удалены с диска.
- Отправить на модерацию → в кабинете галерея только для просмотра, загрузка 409; `some`
  видит галерею; одобрить.
- Гость: обложка в карточке ленты, галерея на странице поста, страница картинки —
  навигация, подпись как `alt`, комментарии (написать от `some`, скрыть от `alice`);
  счётчик у превью; блок под постом не считает комментарии картинки.
- Вернуть пост в черновик → удалить картинку с комментариями — подтверждение с числом,
  комментарии удалены.
- `/uploads/../../storage/dev.db`, `/uploads/x.webp` — 404; заголовок кэша.
- OG-картинка с обложкой; консоль без ошибок; подчистка файлов и строк.
