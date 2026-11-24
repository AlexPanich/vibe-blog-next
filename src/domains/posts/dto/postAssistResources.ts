import z from "zod";

export const POST_STYLE_KINDS = [ 'spelling', 'grammar', 'style' ] as const;

export type PostStyleKind = (typeof POST_STYLE_KINDS)[number]

export const POST_STYLE_KIND_LABELS: Record<PostStyleKind, string> = {
  spelling: 'Орфография',
  grammar: 'Грамматика',
  style: 'Стиль'
}

/*
  Что просим у модели (спека 55). Только типы и enum, без min/max (реш. 8 плана): длины,
  количество и диапазоны проверяет и режет action. describe уходит в JSON Schema — подсказка
  обеим моделям
*/
export const postTitleOutputSchema = z.object({
  titles: z.array(z.string().describe('Заголовок поста: до 120 символов, без кавычек и точки в конце')).describe('3 варианта')
})

export const postLeadOutputSchema = z.object({
  leads: z.array(z.string().describe('Подзаголовок: 1–2 фразы, 20–200 символов')).describe('3 варианта, разных по смыслу')
})

export const postTagOutputSchema = z.object({
  tags: z.array(z.object({
    id: z.number().describe('id рубрики строго из списка <tags>'),
    reason: z.string().describe('Почему подходит — одна фраза')
  })).describe('До 5 рубрик; ничего не подходит — пустой список')
})

export const postStyleOutputSchema = z.object({
  issues: z.array(z.object({
    kind: z.enum(POST_STYLE_KINDS).describe('spelling — орфография, grammar — грамматика, style — явная стилистическая ошибка'),
    quote: z.string().describe('Дословный фрагмент markdown из <content>: несколько слов с контекстом, встречается в тексте один раз'),
    replacement: z.string().describe('Тот же фрагмент целиком, исправленный, с той же разметкой'),
    explanation: z.string().describe('Что не так — одна фраза')
  })).describe('До 20 замечаний; нет ошибок — пустой список')
})

export const postRouteOutputSchema = z.object({
  points: z.array(z.object({
    label: z.string().describe('Короткое название места, как его пишут на карте'),
    lat: z.number().describe('Широта центра места'),
    lng: z.number().describe('Долгота центра места'),
    quote: z.string().describe('Дословный фрагмент текста, где место названо')
  })).describe('Места в порядке текста, до 20; мест нет — пустой список')
})

// Результат после фильтров — то, что уходит в клиент
export const postVariantsResult = z.object({ variants: z.array(z.string()) })

export type PostVariantsResult = z.infer<typeof postVariantsResult>

export const postTagResult = z.object({
  tags: z.array(z.object({ id: z.number(), name: z.string(), reason: z.string() }))
})

export type PostTagResult = z.infer<typeof postTagResult>

export const postStyleIssueResult = z.object({
  kind: z.enum(POST_STYLE_KINDS),
  quote: z.string(),
  replacement: z.string(),
  explanation: z.string()
})

export type PostStyleIssueResult = z.infer<typeof postStyleIssueResult>

export const postStyleResult = z.object({ issues: z.array(postStyleIssueResult) })

export type PostStyleResult = z.infer<typeof postStyleResult>

export const postRoutePointResult = z.object({
  label: z.string(),
  lat: z.number(),
  lng: z.number(),
  quote: z.string()
})

export type PostRoutePointResult = z.infer<typeof postRoutePointResult>

export const postRouteResult = z.object({ points: z.array(postRoutePointResult) })

export type PostRouteResult = z.infer<typeof postRouteResult>
