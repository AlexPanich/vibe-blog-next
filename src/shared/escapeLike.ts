/*
  Экранирует %, _ и \ для LIKE ... ESCAPE '\'
*/
export function escapeLike(value: string){
  return value.replace(/[\\%_]/g, char => `\\${char}`);
}
