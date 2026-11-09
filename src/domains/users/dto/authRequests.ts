import z from "zod";

/* нормализуем до проверки формата: иначе Alice@x.com и alice@x.com — разные ключи rate limit */
const email = z.string().trim().toLowerCase().pipe(z.email());

const password = z.string().min(8).max(64);

export const userSignupDto = z.object({
  name: z.string().min(2).max(16),
  email,
  password
})

export type UserSignupDto = z.infer<typeof userSignupDto>

export const userSigninDto = z.object({
  email,
  password
})

export type UserSigninDto = z.infer<typeof userSigninDto>

export const forgotPasswordDto = z.object({
  email
})

export type ForgotPasswordDto = z.infer<typeof forgotPasswordDto>

export const resetPasswordDto = z.object({
  token: z.string().min(1),
  password,
  confirm: z.string()
}).refine(d => d.password === d.confirm, { path: [ 'confirm' ], message: 'Пароли не совпадают' })

export type ResetPasswordDto = z.infer<typeof resetPasswordDto>

export const changePasswordDto = z.object({
  current: z.string().min(1, 'Введите текущий пароль'),
  password,
  confirm: z.string()
}).refine(d => d.password === d.confirm, { path: [ 'confirm' ], message: 'Пароли не совпадают' })

export type ChangePasswordDto = z.infer<typeof changePasswordDto>

export const changeEmailDto = z.object({
  email,
  current: z.string().min(1, 'Введите текущий пароль')
})

export type ChangeEmailDto = z.infer<typeof changeEmailDto>

export const userBioDto = z.object({
  bio: z.string().trim().max(500, 'Не больше 500 символов'),
  // «Ещё у …» (спека 41): одно-два слова, до 40; пусто — null в action
  nameGenitive: z.string().trim().transform(v => v.replace(/\s+/g, ' '))
    .pipe(z.string().max(40, 'Не больше 40 символов').refine(v => v.split(' ').length <= 2, 'Одно или два слова'))
})

export type UserBioDto = z.infer<typeof userBioDto>

// Загрузка аватара и обложки профиля: файл проверяет readImage в action
export const imageUploadDto = z.object({
  file: z.instanceof(File, { message: 'Выберите файл' })
})
