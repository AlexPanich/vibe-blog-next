import type { NotificationType } from "@/database/schema";
import { IconAlertCircle, IconAward, IconFlag, IconCircleCheck, IconFileText, IconMail, IconMessageCircle, IconShieldCheck, IconStar, IconUserCheck, IconUserPlus, type Icon } from "@tabler/icons-react";

export type NotificationTone = 'mint' | 'coral' | 'sun' | 'plum' | 'ink'

// Вид уведомления по типу (спека 42): цветная иконка, заголовок, подпись действия
export function notificationLook(type: NotificationType): NotificationLook {
  return LOOKS[type];
}

type NotificationLook = {
  icon: Icon,
  tone: NotificationTone,
  // Заголовок строки на странице уведомлений: «Пост опубликован»
  title: string,
  // Подпись ссылки-действия: «Открыть пост», «Исправить»
  action: string
}

const LOOKS: Record<NotificationType, NotificationLook> = {
  'post.approved': { icon: IconCircleCheck, tone: 'mint', title: 'Пост опубликован', action: 'Открыть пост' },
  'post.unblocked': { icon: IconCircleCheck, tone: 'mint', title: 'Пост разблокирован', action: 'Открыть пост' },
  'post.published': { icon: IconFileText, tone: 'plum', title: 'Новый пост', action: 'Читать' },
  'post.featured': { icon: IconAward, tone: 'sun', title: 'Выбор редакции', action: 'Открыть пост' },
  'post.rejected': { icon: IconAlertCircle, tone: 'coral', title: 'Пост отклонён', action: 'Исправить' },
  'post.blocked': { icon: IconAlertCircle, tone: 'coral', title: 'Пост заблокирован', action: 'Открыть пост' },
  'comment.created': { icon: IconMessageCircle, tone: 'sun', title: 'Комментарий к посту', action: 'Ответить' },
  'comment.reply': { icon: IconMessageCircle, tone: 'sun', title: 'Ответ на комментарий', action: 'Ответить' },
  'comment.edited': { icon: IconMessageCircle, tone: 'sun', title: 'Комментарий изменён', action: 'Открыть' },
  'comment.hidden': { icon: IconAlertCircle, tone: 'coral', title: 'Комментарий скрыт', action: 'Открыть пост' },
  'comment.unhidden': { icon: IconCircleCheck, tone: 'mint', title: 'Комментарий возвращён', action: 'Открыть' },
  'message.created': { icon: IconMail, tone: 'ink', title: 'Личные сообщения', action: 'Ответить' },
  'post.rated': { icon: IconStar, tone: 'sun', title: 'Оценка поста', action: 'Открыть пост' },
  'user.followed': { icon: IconUserPlus, tone: 'mint', title: 'Новый подписчик', action: 'Профиль' },
  'user.role_granted': { icon: IconUserCheck, tone: 'mint', title: 'Новая роль', action: 'Подробнее' },
  'user.role_revoked': { icon: IconAlertCircle, tone: 'coral', title: 'Роль снята', action: 'Профиль' },
  'user.avatar_removed': { icon: IconAlertCircle, tone: 'coral', title: 'Аватар удалён', action: 'Профиль' },
  'user.cover_removed': { icon: IconAlertCircle, tone: 'coral', title: 'Обложка удалена', action: 'Профиль' },
  'user.unbanned': { icon: IconUserCheck, tone: 'plum', title: 'Аккаунт разблокирован', action: 'Профиль' },
  'author_request.rejected': { icon: IconAlertCircle, tone: 'coral', title: 'Заявка отклонена', action: 'Подробнее' },
  'author_request.created': { icon: IconShieldCheck, tone: 'plum', title: 'Заявка в авторы', action: 'Рассмотреть' },
  'post.submitted': { icon: IconShieldCheck, tone: 'plum', title: 'Пост ждёт модерации', action: 'Проверить' },
  'report.created': { icon: IconShieldCheck, tone: 'plum', title: 'Жалоба на комментарий', action: 'Разобрать' },
  'report.resolved': { icon: IconShieldCheck, tone: 'plum', title: 'Жалоба рассмотрена', action: 'Открыть' },
  'post_report.created': { icon: IconFlag, tone: 'plum', title: 'Жалоба на пост', action: 'Разобрать' },
  'post_report.resolved': { icon: IconFlag, tone: 'plum', title: 'Жалоба рассмотрена', action: 'Открыть' },
};
