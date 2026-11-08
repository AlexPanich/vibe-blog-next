import z from "zod"
import { USER_ROLES } from "@/database/schema"

/*
  Левое меню кабинета: карточка пользователя сверху и пункты по ролям — с сервера, чтобы
  пункты были в разметке сразу, а не появлялись после гидрации. counts — бейджи пунктов
*/
export const officeMenuResource = z.object({
  id: z.number(),
  name: z.string(),
  avatarKey: z.string().nullable(),
  roles: z.array(z.enum(USER_ROLES)),
  counts: z.object({
    moderating: z.number(),
    reports: z.number(),
    authorRequests: z.number(),
    messages: z.number(),
    notifications: z.number()
  })
})

export type OfficeMenuResource = z.infer<typeof officeMenuResource>
