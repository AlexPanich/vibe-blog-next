import z from "zod";
import { TAGS_PER_POST } from "@/domains/tags/exports/tagRequests";
import { contentImageProblem } from "@/domains/posts/shared/postGalleryRefs";

export const aiIdSchema = z.int().positive();

// До 6 знаков после запятой — точность ~10 см, дальше шум
const coordinate = (min: number, max: number) => z.number({ error: 'Укажите число' })
  .min(min, `От ${min} до ${max}`)
  .max(max, `От ${min} до ${max}`)
  .transform(n => Math.round(n * 1e6) / 1e6);

// Маршрут путешествия (спека 37): пределы нужны и форме
export const POST_ROUTE_MAX = 20;

export const ROUTE_LABEL_MAX = 60;

export const TRAVEL_DAYS_MAX = 365;

// Подпись точки — обычный текст, края обрезаются, пустая — null
const routeLabel = z.string()
  .default('')
  .transform(v => v.trim() || null)
  .pipe(z.string().max(ROUTE_LABEL_MAX, `Не больше ${ROUTE_LABEL_MAX} символов`).nullable());

const routePoint = z.object({ lat: coordinate(-90, 90), lng: coordinate(-180, 180), label: routeLabel });

export type RoutePointDto = z.infer<typeof routePoint>

const travelDaysMessage = `От 1 до ${TRAVEL_DAYS_MAX}`;

/*
  Поля, зависящие от типа поста. Ссылка выводится как <a href>, поэтому только http(s)
*/
export const postDetailsDto = z.discriminatedUnion('type', [
  z.object({ type: z.literal('simple') }),
  z.object({
    type: z.literal('translate'),
    source: z.url({ protocol: /^https?$/, error: 'Нужна ссылка http(s)://' }).max(500)
  }),
  z.object({
    type: z.literal('travel'),
    points: z.array(routePoint)
      .min(1, 'Поставьте хотя бы одну точку на карте')
      .max(POST_ROUTE_MAX, `Не больше ${POST_ROUTE_MAX} точек`),
    travelDays: z.int({ error: 'Целое число дней' })
      .min(1, travelDaysMessage)
      .max(TRAVEL_DAYS_MAX, travelDaysMessage)
      .nullable()
      .default(null)
  })
])

export type PostDetailsDto = z.infer<typeof postDetailsDto>

// Пределы нужны и форме: счётчик символов у заголовка (спека 42)
export const POST_URL_MAX = 80;

export const POST_TITLE_MAX = 120;

export const POST_LEAD_MIN = 20;

export const POST_LEAD_MAX = 200;

const leadMessage = `От ${POST_LEAD_MIN} до ${POST_LEAD_MAX} символов`;

/*
  Подзаголовок (спека 35): необязателен, обычный текст в одну строку. Пробельные
  последовательности, в том числе переводы строк, сворачиваются, пустой — null
*/
const postLead = z.string()
  .default('')
  .transform(v => v.replace(/\s+/g, ' ').trim())
  .transform(v => v || null)
  .pipe(z.string().min(POST_LEAD_MIN, leadMessage).max(POST_LEAD_MAX, leadMessage).nullable());

export const postOwnCreateDto = z.object({
  url: z.string().min(5, 'Не короче 5 символов').max(POST_URL_MAX, `Не длиннее ${POST_URL_MAX} символов`),
  title: z.string().min(5, 'Не короче 5 символов').max(POST_TITLE_MAX, `Не длиннее ${POST_TITLE_MAX} символов`),
  lead: postLead,
  // Картинки — только фото галереи, каждое один раз (спека 38); чужие id вычищает action
  content: z.string().min(5, 'Текст поста — не короче 5 символов').superRefine((value, ctx) => {
    const problem = contentImageProblem(value);

    if(problem){
      ctx.addIssue({ code: 'custom', message: problem });
    }
  }),
  tagIds: z.array(z.int().positive())
    .max(TAGS_PER_POST, `Не больше ${TAGS_PER_POST} рубрик`)
    .transform(ids => [ ...new Set(ids) ]),
  details: postDetailsDto
})

export type PostOwnCreateDto = z.infer<typeof postOwnCreateDto>

/*
  Редактор (спека 42): «Сохранить черновик» и «Отправить на проверку» — один запрос,
  submit после записи делает переход draft → moderating
*/
export const postEditorDto = postOwnCreateDto.extend({
  submit: z.boolean().default(false)
})

export type PostEditorDto = z.input<typeof postEditorDto>

/*
  Сохранение черновика (спека 49): version — updatedAt, с которым открыт редактор. Пост успели
  сохранить в другой вкладке — 409, а не молчаливая перезапись чужой правки
*/
export const postUpdateDto = postEditorDto.extend({
  version: z.date()
})

/*
  «Изменить» вне черновика: статус, который видел автор. По нему выбирается переход — если
  статус успел смениться, переход вернёт 409, а не сделает то, о чём автора не спрашивали
*/
export const postEditStartDto = z.object({
  status: z.enum([ 'published', 'moderating', 'rejected', 'blocked', 'hidden' ])
})

export type PostEditStartDto = z.infer<typeof postEditStartDto>

// Избранное на странице автора видно всем (спека 40)
export const postFavoritesPublicDto = z.object({
  favoritesPublic: z.boolean()
})
