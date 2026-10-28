'use client'

import 'client-only';
import UserGate from "@/components/general/UserGate";
import { createPost } from "@/domains/posts/policy";
import { ReactNode } from "react";

type PostAuthorGateProps = {
  // Есть роль author: можно создать пост
  author: ReactNode,
  // Гость или вошедший без роли: создание дало бы 403
  other?: ReactNode,
  // До гидрации: роль ещё неизвестна
  fallback?: ReactNode
}

// Ссылки на создание поста на публичных страницах: сессию там знает только клиент.
export default function PostAuthorGate({ author, other = null, fallback = null }: PostAuthorGateProps) {
  return <UserGate fallback={fallback} guest={other} auth={user => createPost(user) ? author : other} />;
}
