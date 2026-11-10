/*
  Расстояние Левенштейна: вставки, удаления и замены по символам (а не по UTF-16), две
  строки таблицы вместо всей матрицы
*/
export function levenshtein(a: string, b: string): number {
  const s = [ ...a ];
  const t = [ ...b ];
  let prev = Array.from({ length: t.length + 1 }, (_, j) => j);

  for(let i = 1; i <= s.length; i++){
    const row = [ i ];

    for(let j = 1; j <= t.length; j++){
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
    }

    prev = row;
  }

  return prev[t.length];
}
