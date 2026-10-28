// Обрезок для списка диалогов: первая непустая строка, не длиннее 120 символов. И сервер, и клиент
export function messageSnippet(content: string){
  const line = content.split('\n').find(l => l.trim() !== '')?.trim() ?? '';

  return line.length > 120 ? `${line.slice(0, 119)}…` : line;
}
