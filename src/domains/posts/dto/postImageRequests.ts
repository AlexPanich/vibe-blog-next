import z from "zod";

export const postImageUploadDto = z.object({
  file: z.instanceof(File, { message: 'Выберите файл' })
})

export const postImageCaptionDto = z.object({
  caption: z.string().trim().max(200, 'Не больше 200 символов')
})
