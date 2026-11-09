import type { PostReportReason, PostReportResolution } from "@/database/schema";

// Подписи причин жалобы на пост (спека 36, п. 2) — и диалогу, и карточке очереди
export const POST_REPORT_REASON_LABELS: Record<PostReportReason, string> = {
  spam: 'Спам или реклама',
  abuse: 'Оскорбления',
  copyright: 'Чужой текст или фото',
  misleading: 'Недостоверно',
  other: 'Другое',
};

export const POST_REPORT_RESOLUTION_LABELS: Record<PostReportResolution, string> = {
  blocked: 'Пост заблокирован',
  kept: 'Пост оставлен',
  withdrawn: 'Автор снял пост в черновик',
};
