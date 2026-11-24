import 'server-only';
import { TtlCache } from "@/core/ttlCache";

/*
  Векторы поисковых запросов (спека 56, п. 18): ключ — модель и нормализованный запрос. Повторный
  поиск и смена фильтров модель не дёргают. В globalThis — переживает HMR в dev
*/
const store = globalThis as unknown as { queryEmbeddings?: TtlCache<Float32Array> };

export const queryEmbeddings = store.queryEmbeddings ??= new TtlCache<Float32Array>({ max: 500, ttlMs: 60 * 60_000 });
