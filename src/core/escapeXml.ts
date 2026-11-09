// Символы, запрещённые в XML 1.0: один такой в тексте — и читалка отбросит весь документ
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

// Текст и значения атрибутов для XML; & — первым, иначе экранируется уже экранированное
export function escapeXml(value: string){
  return value
    .replace(INVALID_XML_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
