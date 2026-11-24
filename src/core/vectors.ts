/*
  Векторы эмбеддингов: нормирование, сходство и упаковка в BLOB. У нормированных векторов
  скалярное произведение — косинус
*/

// Деление на L2-норму; нулевой вектор нормировать нельзя — исключение
export function normalize(values: number[]): Float32Array {
  let sum = 0;

  for(const value of values){
    sum += value * value;
  }

  const norm = Math.sqrt(sum);

  if(!Number.isFinite(norm) || norm === 0){
    throw new Error('Пустой вектор');
  }

  return Float32Array.from(values, value => value / norm);
}

// null — векторы разной длины (разные модели или ручная правка базы): сравнивать нельзя
export function dot(a: Float32Array, b: Float32Array): number | null {
  if(a.length !== b.length){
    return null;
  }

  let sum = 0;

  for(let i = 0; i < a.length; i++){
    sum += a[i] * b[i];
  }

  return sum;
}

export function toBlob(vector: Float32Array): Buffer {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
}

/*
  Копией: Buffer драйвера может лежать в общем пуле со смещением, не кратным 4, а Float32Array
  поверх такого смещения бросает RangeError
*/
export function fromBlob(buffer: Uint8Array): Float32Array {
  return new Float32Array(new Uint8Array(buffer).buffer);
}

// Самые похожие на query не ниже порога min, по убыванию сходства
export function topBySimilarity<T>(query: Float32Array, items: { id: T, vector: Float32Array }[], min: number, limit: number): { id: T, score: number }[] {
  const scored: { id: T, score: number }[] = [];

  for(const item of items){
    const score = dot(query, item.vector);

    if(score !== null && score >= min){
      scored.push({ id: item.id, score });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
