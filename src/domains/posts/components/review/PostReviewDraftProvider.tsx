'use client'

import 'client-only';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// n растёт с каждой вставкой: тот же текст, вставленный второй раз, тоже доходит до формы
type ReviewDraft = { text: string, n: number }

type ReviewDraftContext = {
  draft: ReviewDraft | null,
  insert: (text: string) => void
}

const Context = createContext<ReviewDraftContext>({ draft: null, insert: () => {} });

/*
  Черновик комментария отклонения от разбора ИИ (спека 54, п. 12): блок разбора и карточка
  решения — соседи в колонке ревью, форма живёт внутри решения
*/
export default function PostReviewDraftProvider({ children }: { children: ReactNode }) {
  const [ draft, setDraft ] = useState<ReviewDraft | null>(null);
  const insert = useCallback((text: string) => setDraft(prev => ({ text, n: (prev?.n ?? 0) + 1 })), []);
  const value = useMemo(() => ({ draft, insert }), [ draft, insert ]);

  return <Context.Provider value={value}>{ children }</Context.Provider>;
}

export function useReviewDraft(){
  return useContext(Context);
}
