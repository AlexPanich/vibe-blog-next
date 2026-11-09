import z from "zod";
import { TAGS_PER_POST } from "@/domains/tags/exports/tagRequests";

export const aiIdSchema = z.int().positive();

// До 6 знаков после запятой — точность ~10 см, дальше шум
const coordinate = (min: number, max: number) => z.number({ error: 'Укажите число' })
  .min(min, `От ${min} до ${max}`)
  .max(max, `От ${min} до ${max}`)
  .transform(n => Math.round(n * 1e6) / 1e6);

/*
  Поля, зависящие от типа поста. Ссылка выводится как <a href>, поэтому только http(s)
*/
export const postDetailsDto = z.discriminatedUnion('type', [
  z.object({ type: z.literal('simple') }),
  z.object({
    type: z.literal('translate'),
    source: z.url({ protocol: /^https?$/, error: 'Нужна ссылка http(s)://' }).max(500)
  }),
  z.object({ type: z.literal('travel'), lat: coordinate(-90, 90), lng: coordinate(-180, 180) })
])

export type PostDetailsDto = z.infer<typeof postDetailsDto>

// Пределы нужны и форме: счётчик символов у заголовка (спека 42)
export const POST_URL_MAX = 16;

export const POST_TITLE_MAX = 16;

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
  url: z.string().min(5).max(POST_URL_MAX),
  title: z.string().min(5).max(POST_TITLE_MAX),
  lead: postLead,
  content: z.string().min(5),
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
  «Изменить» вне черновика: статус, который видел автор. По нему выбирается переход — если
  статус успел смениться, переход вернёт 409, а не сделает то, о чём автора не спрашивали
*/
export const postEditStartDto = z.object({
  status: z.enum([ 'published', 'moderating', 'rejected', 'blocked', 'hidden' ])
})

export type PostEditStartDto = z.infer<typeof postEditStartDto>
