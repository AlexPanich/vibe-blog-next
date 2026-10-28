'use client'

import 'client-only';
import UserGate from "@/components/general/UserGate";
import { moderatePosts } from "@/domains/posts/policy";
import Link from "@/components/general/Link";
import { IconShieldCheck } from "@tabler/icons-react";

// Ссылка на страницу модерации поста — только навигация, права проверяют page и actions.
export default function PostModerateLink({ id }: { id: number }) {
  return (
    <UserGate auth={user => moderatePosts(user) && (
      <Link href={`/office/moderation/posts/${id}`} className="ui-meta__item">
        <IconShieldCheck size={14} stroke={1.8} />Модерировать
      </Link>
    )} />
  );
}
