import type { AiIssueCategory, AiVerdict } from "@/database/schema";

// Подписи разбора ИИ (спека 54): блоку на странице ревью и чипу очереди
export const AI_VERDICT_LABELS: Record<AiVerdict, string> = {
  ok: 'чисто',
  doubt: 'под вопросом',
  violation: 'нарушение',
};

export const AI_ISSUE_CATEGORY_LABELS: Record<AiIssueCategory, string> = {
  spam: 'Спам',
  copyright: 'Чужой контент',
  abuse: 'Оскорбления',
  personal_data: 'Личные данные',
  wrong_type: 'Не тот тип',
  other: 'Другое',
};
