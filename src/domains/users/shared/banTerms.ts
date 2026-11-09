/*
  Сроки блокировки (спека 46). Клиент передаёт только ключ, момент окончания считает
  сервер: now + days × 24 ч. days: null — навсегда
*/
export const BAN_TERMS = {
  '7d': { label: '7 дней', days: 7 },
  '30d': { label: '30 дней', days: 30 },
  forever: { label: 'Навсегда', days: null },
} as const satisfies Record<string, { label: string, days: number | null }>;

export type BanTerm = keyof typeof BAN_TERMS;

export const BAN_TERM_KEYS = Object.keys(BAN_TERMS) as [ BanTerm, ...BanTerm[] ];

export const DEFAULT_BAN_TERM: BanTerm = '7d';

export function banUntil(term: BanTerm, now: Date): Date | null {
  const days = BAN_TERMS[term].days;

  return days === null ? null : new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
