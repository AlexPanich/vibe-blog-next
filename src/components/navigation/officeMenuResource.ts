import z from "zod"
import { USER_ROLES } from "@/database/schema"

/*
  Роли текущего пользователя для левого меню кабинета: с сервера, чтобы пункты
  по ролям были в разметке сразу, а не появлялись после гидрации. counts — бейджи пунктов
*/
export const officeMenuResource = z.object({
  roles: z.array(z.enum(USER_ROLES)),
  counts: z.object({
    reports: z.number(),
    authorRequests: z.number(),
    messages: z.number(),
    notifications: z.number()
  })
})

export type OfficeMenuResource = z.infer<typeof officeMenuResource>
