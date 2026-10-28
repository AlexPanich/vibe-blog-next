'use client'

import 'client-only';
import { createContext, useContext } from "react";

export type UserBlockState = { blocking: boolean, blockedBy: boolean, canBlock: boolean }

export type UserBlockContextValue = {
  authorId: number,
  authorName: string,
  // null — ещё не пришло, гость или своя страница: всё видно, кнопки нет
  state: UserBlockState | null,
  setState: (state: UserBlockState) => void
}

export const UserBlockContext = createContext<UserBlockContextValue | null>(null);

export function useUserBlock(){
  const value = useContext(UserBlockContext);

  if(!value){
    throw new Error('UserBlock* вне UserBlockProvider');
  }

  return value;
}
