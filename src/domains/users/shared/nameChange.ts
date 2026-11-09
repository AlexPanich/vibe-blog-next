/*
  Смена имени (спека 45): не чаще раза в 24 часа от name_changed_at, не календарные сутки.
  Общее для updateNameAction, страницы профиля и формы — без server-only
*/

export const NAME_CHANGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Когда снова можно сменить имя; null — уже можно (или ещё не меняли)
export function nextNameChangeAt(changedAt: Date | null, now = new Date()): Date | null {
  if(!changedAt){
    return null;
  }

  const next = new Date(changedAt.getTime() + NAME_CHANGE_INTERVAL_MS);

  return next > now ? next : null;
}

// trim и повторные пробелы в один — до проверки длины и до сравнения со старым именем
export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
