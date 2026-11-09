import z from "zod";

export const aiIdSchema = z.int().positive();

export const MESSAGE_MAX = 2000;

export const messageDto = z.object({
  content: z.string().trim().min(1, 'Напишите текст').max(MESSAGE_MAX, `Не больше ${MESSAGE_MAX} символов`)
})

export type MessageDto = z.infer<typeof messageDto>

// История диалога: старше beforeId («Показать более ранние») или новее afterId (после переподключения)
export const messagePageDto = z.object({
  beforeId: z.int().positive().optional(),
  afterId: z.int().positive().optional()
})

export type MessagePageDto = z.infer<typeof messagePageDto>

/*
  Курсор списка диалогов: время последнего сообщения (мс) и id; без курсора — первая порция.
  q — поиск по имени собеседника
*/
export const dialogPageDto = z.object({
  beforeAt: z.int().nonnegative().optional(),
  beforeId: z.int().positive().optional(),
  q: z.string().trim().max(100).optional()
})

export type DialogPageDto = z.infer<typeof dialogPageDto>

export const messageRestrictDto = z.object({ restrict: z.boolean() })

export const messageIgnoreDto = z.object({ ignore: z.boolean() })

export const messagesFriendsOnlyDto = z.object({ friendsOnly: z.boolean() })

// Выбор собеседника (спека 50): запрос из адреса; длинный обрезается, массив — как без запроса
export const messagePickerDto = z.object({
  q: z.string().transform(s => s.trim().slice(0, 100)).optional().catch(undefined)
})

export type MessagePickerDto = z.infer<typeof messagePickerDto>
