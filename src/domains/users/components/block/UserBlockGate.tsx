'use client'

import 'client-only';
import { useUserBlock } from "@/domains/users/components/block/userBlockContext";

// Часть страницы автора, которой нет у того, кто его заблокировал
export default function UserBlockGate({ children }: { children: React.ReactNode }) {
  const { state } = useUserBlock();

  return state?.blocking ? null : children;
}
