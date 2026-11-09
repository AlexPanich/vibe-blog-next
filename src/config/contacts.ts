import 'server-only';

const userId = process.env.CONTACT_USER_ID?.trim() ?? '';

/*
  Контакты на /contacts (спека 31). Не задан ключ — нет и карточки. id администрации —
  только каноническое положительное целое, иначе ссылка «Написать» вела бы на 404
*/
export const contactsConfig = {
  email: process.env.CONTACT_EMAIL?.trim() || null,
  userId: /^[1-9]\d*$/.test(userId) && Number.isSafeInteger(Number(userId)) ? Number(userId) : null
}
