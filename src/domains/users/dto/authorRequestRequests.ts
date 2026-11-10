import z from "zod";
import { normalizeAuthorRequestLink } from "@/domains/users/shared/authorRequestLink";

// После отказа новая заявка — не раньше чем через столько дней (спека 28)
export const AUTHOR_REQUEST_PAUSE_DAYS = 7;

export const AUTHOR_REQUEST_TEXT_MIN = 30;

export const AUTHOR_REQUEST_TEXT_MAX = 1000;

export const authorRequestDto = z.object({
  text: z.string().trim()
    .min(AUTHOR_REQUEST_TEXT_MIN, `Расскажите подробнее — хотя бы ${AUTHOR_REQUEST_TEXT_MIN} символов`)
    .max(AUTHOR_REQUEST_TEXT_MAX, `Не больше ${AUTHOR_REQUEST_TEXT_MAX} символов`),
  // «Где почитать ваши тексты» (спека 48): пусто — null, без схемы — дописываем https://
  link: z.string().optional().transform((value, ctx) => {
    const result = normalizeAuthorRequestLink(value ?? '');

    if('error' in result){
      ctx.issues.push({ code: 'custom', message: result.error, input: value });

      return z.NEVER;
    }

    return result.link;
  }),
})

export type AuthorRequestDto = z.infer<typeof authorRequestDto>

// Причину отказа увидит заявитель
export const authorRequestRejectDto = z.object({
  reason: z.string().trim().min(3, 'Укажите причину отказа').max(500)
})

export type AuthorRequestRejectDto = z.infer<typeof authorRequestRejectDto>

/*
  Вкладка и страница списка в админке из searchParams: неизвестная вкладка — «Ожидают»,
  мусор в page — первая. Страницы — только у «Рассмотренных»
*/
export const authorRequestAdminFilterDto = z.object({
  tab: z.enum([ 'pending', 'decided' ]).catch('pending').default('pending'),
  page: z.coerce.number().int().min(1).catch(1).default(1),
})

export type AuthorRequestAdminFilterDto = z.infer<typeof authorRequestAdminFilterDto>

export const authorRequestIdSchema = z.int().positive();
