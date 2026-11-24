import z from "zod"
import { AI_ISSUE_CATEGORIES, AI_VERDICTS } from "@/database/schema"

/*
  Что просим у модели (спека 54, п. 7). Только типы и enum, без min/max: structured outputs
  Anthropic и format Ollama поддерживают ограничения по-разному. Длины режет сохранение.
  describe уходит в JSON Schema — подсказка обеим моделям
*/
export const postAiReviewOutputSchema = z.object({
  verdict: z.enum(AI_VERDICTS).describe('ok — нарушений правил не видно; doubt — человеку стоит посмотреть; violation — нарушение явное'),
  summary: z.string().describe('1–2 предложения: о чём пост и что в нём смущает'),
  issues: z.array(z.object({
    category: z.enum(AI_ISSUE_CATEGORIES).describe('Какое правило под вопросом'),
    quote: z.string().describe('Дословный фрагмент поста, к которому относится замечание'),
    explanation: z.string().describe('Почему фрагмент нарушает правило — одно-два предложения')
  })).describe('Пункты правил под вопросом; при ok — пустой список'),
  rejectComment: z.string().nullable().describe('Черновик комментария автору при отклонении: на «вы», спокойно, что поправить. При ok — null')
})

export type PostAiReviewOutput = z.infer<typeof postAiReviewOutputSchema>

// Пункт после проверки цитат: не найденная в посте цитата — null и quoteMissing (п. 8)
export const postAiReviewIssueResource = z.object({
  category: z.enum(AI_ISSUE_CATEGORIES),
  quote: z.string().nullable(),
  quoteMissing: z.boolean(),
  explanation: z.string()
})

export type PostAiReviewIssueResource = z.infer<typeof postAiReviewIssueResource>

// Чтение колонки post_ai_reviews.issues
export const postAiReviewIssuesSchema = z.array(postAiReviewIssueResource)

// Один разбор — то, что рисует блок. Зависший pending сервер уже превратил в failed
export const postAiReviewResource = z.object({
  state: z.enum([ 'pending', 'done', 'failed' ]),
  verdict: z.enum(AI_VERDICTS).nullable(),
  summary: z.string().nullable(),
  issues: postAiReviewIssuesSchema,
  rejectComment: z.string().nullable(),
  model: z.string().nullable(),
  error: z.string().nullable(),
  submittedAt: z.coerce.date()
})

export type PostAiReviewResource = z.infer<typeof postAiReviewResource>

export const AI_REVIEW_VIEWS = [ 'empty', 'pending', 'done', 'failed', 'outdated' ] as const

export type AiReviewView = (typeof AI_REVIEW_VIEWS)[number]

/*
  Блок «Разбор ИИ» на странице ревью: состояние считает сервер (aiReviewView), previous — разбор
  прошлой отправки, свёрнутый под текущим. enabled — есть ли кнопка «Проверить заново»
*/
export const postAiReviewBlockResource = z.object({
  view: z.enum(AI_REVIEW_VIEWS),
  current: postAiReviewResource.nullable(),
  previous: postAiReviewResource.nullable(),
  enabled: z.boolean()
})

export type PostAiReviewBlockResource = z.infer<typeof postAiReviewBlockResource>

// Чип в очереди: вердикт текущего разбора или «читает»
export type QueueAiVerdict = 'ok' | 'doubt' | 'violation' | 'pending'
